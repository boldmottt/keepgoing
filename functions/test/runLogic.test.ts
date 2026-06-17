import { decideFinishRun, FinishRunContext } from "../src/runLogic";
import { ScorePayload } from "../src/validation";

/**
 * finishRun 순수 결정 로직 테스트 (SPEC.md §5, §14 10단계 플로우의 결정 부분).
 *
 * 가장 결합도/위험도 높은 로직(accept/reject 결정 + 집계 델타)을
 * Firestore 에뮬레이터 없이 단위 테스트로 고정한다.
 * runs.ts 의 트랜잭션은 문서를 읽어 이 결정을 호출하고 결과를 그대로 적용한다.
 */

/** floor(gameScore*0.1) 로 올바른 donationPoints 를 갖는 유효 점수. */
function validScore(over: Partial<ScorePayload> = {}): ScorePayload {
  const gameScore = over.gameScore ?? 1000;
  return {
    durationSec: 60,
    distanceMeters: 500,
    gameScore,
    donationPoints: Math.floor(gameScore * 0.1),
    ...over,
  };
}

/** 모든 가드를 통과하는 happy-path 컨텍스트. */
function happyCtx(over: Partial<FinishRunContext> = {}): FinishRunContext {
  return {
    hasActiveSeason: true,
    seasonId: "season-1",
    runExists: false,
    userStatus: "active",
    userExists: true,
    projectExists: true,
    projectStatus: "active",
    projectSeasonId: "season-1",
    hasPriorProjectContribution: false,
    score: validScore(),
    specialStageEntered: false,
    ...over,
  };
}

describe("decideFinishRun - happy path (1)", () => {
  it("유효 점수 + active 시즌/프로젝트/유저 → confirmed, 올바른 델타", () => {
    // gameScore 12455 → donationPoints 1245 (floor)
    const ctx = happyCtx({ score: validScore({ gameScore: 12455 }) });
    const d = decideFinishRun(ctx);

    expect(d.accept).toBe(true);
    expect(d.validationStatus).toBe("confirmed");
    expect(d.rejectReason).toBeNull();
    expect(d.kind).toBeNull();
    expect(d.deltas).not.toBeNull();

    const x = d.deltas!;
    expect(x.points).toBe(1245);
    // donationPoints 가 유저/프로젝트/시즌에 동일하게 반영
    expect(x.userTotalDonationPointsInc).toBe(1245);
    expect(x.userSeasonDonationPointsInc).toBe(1245);
    expect(x.projectConfirmedPointsInc).toBe(1245);
    expect(x.seasonTotalConfirmedPointsInc).toBe(1245);
  });

  it("기존 유저는 isNewParticipant=false, 프로젝트 첫 기여면 participantCount +1", () => {
    const d = decideFinishRun(
      happyCtx({ userExists: true, hasPriorProjectContribution: false })
    );
    expect(d.deltas!.isNewParticipant).toBe(false);
    expect(d.deltas!.projectParticipantCountInc).toBe(1);
  });

  it("신규 유저는 isNewParticipant=true", () => {
    const d = decideFinishRun(
      happyCtx({ userExists: false, userStatus: null })
    );
    expect(d.deltas!.isNewParticipant).toBe(true);
  });

  it("이미 같은 프로젝트에 기여했다면 participantCount 증가 없음(+0)", () => {
    const d = decideFinishRun(happyCtx({ hasPriorProjectContribution: true }));
    expect(d.deltas!.projectParticipantCountInc).toBe(0);
  });
});

describe("decideFinishRun - 잘못된 점수 (2)", () => {
  it("점수 검증 실패 → rejected, invalid_score, 집계 델타 없음", () => {
    // donationPoints 가 floor(gameScore*0.1) 와 불일치
    const ctx = happyCtx({
      score: { durationSec: 60, distanceMeters: 500, gameScore: 1000, donationPoints: 999 },
    });
    const d = decideFinishRun(ctx);

    expect(d.accept).toBe(false);
    expect(d.validationStatus).toBe("rejected");
    expect(d.rejectReason).toBe("invalid_score");
    expect(d.kind).toBe("persist_rejected"); // rejected 로 저장하되 집계 미반영
    expect(d.deltas).toBeNull();
    expect(d.detail).toBe("points_mismatch");
  });

  it("durationSec <= 0 도 invalid_score 로 거부", () => {
    const d = decideFinishRun(
      happyCtx({ score: validScore({ durationSec: 0 }) })
    );
    expect(d.rejectReason).toBe("invalid_score");
    expect(d.detail).toBe("duration_invalid");
    expect(d.deltas).toBeNull();
  });
});

describe("decideFinishRun - 멱등성/중복 runId (3)", () => {
  it("이미 존재하는 run → duplicate_run, throw, 집계 없음(이중 집계 방지)", () => {
    const d = decideFinishRun(happyCtx({ runExists: true }));
    expect(d.accept).toBe(false);
    expect(d.rejectReason).toBe("duplicate_run");
    expect(d.kind).toBe("throw");
    expect(d.deltas).toBeNull();
  });
});

describe("decideFinishRun - 밴 유저 (4)", () => {
  it("banned 유저 → user_banned, throw, 집계 없음", () => {
    const d = decideFinishRun(happyCtx({ userStatus: "banned" }));
    expect(d.accept).toBe(false);
    expect(d.rejectReason).toBe("user_banned");
    expect(d.kind).toBe("throw");
    expect(d.deltas).toBeNull();
  });

  it("suspicious 유저는 차단되지 않는다(현재 정책)", () => {
    const d = decideFinishRun(happyCtx({ userStatus: "suspicious" }));
    expect(d.accept).toBe(true);
  });
});

describe("decideFinishRun - 비활성 시즌 (5)", () => {
  it("active 시즌 없음 → no_active_season, throw", () => {
    const d = decideFinishRun(
      happyCtx({ hasActiveSeason: false, seasonId: null })
    );
    expect(d.accept).toBe(false);
    expect(d.rejectReason).toBe("no_active_season");
    expect(d.kind).toBe("throw");
    expect(d.deltas).toBeNull();
  });
});

describe("decideFinishRun - 프로젝트 가드 (6)", () => {
  it("프로젝트 없음 → project_not_found, throw", () => {
    const d = decideFinishRun(
      happyCtx({ projectExists: false, projectStatus: null, projectSeasonId: null })
    );
    expect(d.rejectReason).toBe("project_not_found");
    expect(d.kind).toBe("throw");
  });

  it("프로젝트 inactive → project_inactive, throw", () => {
    const d = decideFinishRun(happyCtx({ projectStatus: "inactive" }));
    expect(d.rejectReason).toBe("project_inactive");
    expect(d.kind).toBe("throw");
    expect(d.deltas).toBeNull();
  });

  it("프로젝트 seasonId 가 active 시즌과 다르면 → project_inactive, throw", () => {
    const d = decideFinishRun(happyCtx({ projectSeasonId: "other-season" }));
    expect(d.rejectReason).toBe("project_inactive");
    expect(d.kind).toBe("throw");
  });
});

describe("decideFinishRun - 원장(ledger) 엔트리 형태 (7)", () => {
  it("일반 런 confirm 시 source=normal_run, status=confirmed, points 일치", () => {
    const d = decideFinishRun(
      happyCtx({ score: validScore({ gameScore: 2000 }), specialStageEntered: false })
    );
    expect(d.deltas!.ledger).toEqual({
      points: 200,
      source: "normal_run",
      status: "confirmed",
    });
  });

  it("특별 스테이지 진입 시 source=special_stage", () => {
    const d = decideFinishRun(
      happyCtx({ score: validScore({ gameScore: 2000 }), specialStageEntered: true })
    );
    expect(d.deltas!.ledger.source).toBe("special_stage");
    expect(d.deltas!.ledger.points).toBe(200);
  });
});

describe("decideFinishRun - 가드 우선순위", () => {
  it("중복 run 이면서 잘못된 점수여도 duplicate_run 이 우선(점수 검증 전 차단)", () => {
    const d = decideFinishRun(
      happyCtx({
        runExists: true,
        score: { durationSec: 0, distanceMeters: 0, gameScore: 0, donationPoints: 5 },
      })
    );
    expect(d.rejectReason).toBe("duplicate_run");
  });

  it("시즌 없음이 다른 모든 가드보다 우선", () => {
    const d = decideFinishRun(
      happyCtx({ hasActiveSeason: false, seasonId: null, runExists: true, userStatus: "banned" })
    );
    expect(d.rejectReason).toBe("no_active_season");
  });
});
