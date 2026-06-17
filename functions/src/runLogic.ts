/**
 * finishRun 의 순수 결정 로직 (side-effect 없음).
 *
 * Firestore 트랜잭션(runs.ts)에서 분리해 단위 테스트로 고정하기 위한 계층.
 * 입력은 모두 평범한 값(현재 런 존재 여부/상태, 유저 상태, 시즌 상태,
 * 프로젝트 상태/seasonId, 점수 페이로드, 프로젝트 첫 기여 여부)이며,
 * 출력은 accept/reject 여부와 사유, 저장할 validationStatus,
 * 그리고 집계 델타(유저/프로젝트/시즌 증가분 + 원장 엔트리 필드)를 기술한다.
 *
 * runs.ts 의 thin 트랜잭션은 문서를 읽어 이 결정을 호출하고 결과를 그대로 적용한다.
 * 따라서 동작은 기존과 동일하다.
 */
import { validateScore, ScorePayload } from "./validation";

/** finishRun 거부 사유 코드. */
export type FinishRunRejectReason =
  | "no_active_season"
  | "duplicate_run"
  | "user_banned"
  | "project_not_found"
  | "project_inactive"
  | "invalid_score";

/** 결정 로직에 들어가는 평범한(plain) 입력. */
export interface FinishRunContext {
  /** active 시즌이 존재하는가 (없으면 결정 불가). */
  hasActiveSeason: boolean;
  /** active 시즌의 id. hasActiveSeason=true 일 때만 의미 있음. */
  seasonId: string | null;
  /** runId 가 이미 runs 에 존재하는가 (멱등성: 중복 제출 거부). */
  runExists: boolean;
  /** 요청 유저의 status. 유저 문서가 없으면 null. */
  userStatus: string | null;
  /** 유저 문서가 이미 존재하는가 (없으면 신규 참여자). */
  userExists: boolean;
  /** selectedProject 문서가 존재하는가. */
  projectExists: boolean;
  /** selectedProject 의 status. */
  projectStatus: string | null;
  /** selectedProject 의 seasonId (active 시즌과 일치해야 함). */
  projectSeasonId: string | null;
  /**
   * 이 유저가 해당 프로젝트에 이미 confirmed 기부 이력이 있는가.
   * false 이면 신규 프로젝트 참여자로 participantCount 를 증가시킨다.
   */
  hasPriorProjectContribution: boolean;
  /** 점수 페이로드 (검증 대상). */
  score: ScorePayload;
  /** 특별 스테이지 진입 여부 (원장 source 결정). */
  specialStageEntered: boolean;
}

/** 확정(confirm) 시 적용할 집계 델타와 원장 엔트리. */
export interface FinishRunDeltas {
  /** 유저/프로젝트/시즌/리더보드에 더할 포인트. */
  points: number;
  /** 유저 totalDonationPoints 증가분. */
  userTotalDonationPointsInc: number;
  /** 유저 seasonDonationPoints 증가분. */
  userSeasonDonationPointsInc: number;
  /** 유저 문서를 신규 생성해야 하는가. */
  isNewParticipant: boolean;
  /** 프로젝트 confirmedPoints 증가분. */
  projectConfirmedPointsInc: number;
  /** 프로젝트 participantCount 증가분 (0 또는 1). */
  projectParticipantCountInc: number;
  /** 시즌 totalConfirmedPoints 증가분. */
  seasonTotalConfirmedPointsInc: number;
  /** donationPointLedger 엔트리에 들어갈 필드. */
  ledger: {
    points: number;
    source: "normal_run" | "special_stage";
    status: "confirmed";
  };
}

/** 순수 결정 결과. */
export interface FinishRunDecision {
  /** accept(=confirmed) 인가 reject 인가. */
  accept: boolean;
  /** runs 문서에 저장할 validationStatus. */
  validationStatus: "confirmed" | "rejected";
  /** reject 일 때의 사유 코드. accept 면 null. */
  rejectReason: FinishRunRejectReason | null;
  /**
   * reject 의 종류:
   *  - "throw": 트랜잭션에서 HttpsError 를 던져야 하는 가드 위반
   *            (시즌 없음/중복/밴/프로젝트 문제)
   *  - "persist_rejected": rejected 런으로 저장하되 집계는 미반영 (점수 검증 실패)
   *  - null: accept
   */
  kind: "throw" | "persist_rejected" | null;
  /** 점수 검증 상세 사유 (invalid_score 일 때). */
  detail?: string;
  /** accept 일 때만 채워지는 집계 델타. */
  deltas: FinishRunDeltas | null;
}

/**
 * finishRun 의 결정 로직.
 *
 * 가드(시즌/멱등성/밴/프로젝트) 순서는 runs.ts 트랜잭션과 동일하다:
 *   1. active season 없음 → throw(no_active_season)
 *   2. runId 중복 → throw(duplicate_run)
 *   3. banned 유저 → throw(user_banned)
 *   4. 프로젝트 없음 → throw(project_not_found)
 *   5. 프로젝트 inactive 또는 seasonId 불일치 → throw(project_inactive)
 *   6. 점수 검증 실패 → persist_rejected(invalid_score)
 *   7. 통과 → accept(confirmed) + 집계 델타
 */
export function decideFinishRun(ctx: FinishRunContext): FinishRunDecision {
  // 1. active season 확인
  if (!ctx.hasActiveSeason) {
    return {
      accept: false,
      validationStatus: "rejected",
      rejectReason: "no_active_season",
      kind: "throw",
      deltas: null,
    };
  }

  // 2. runId 멱등성 - 중복 제출 거부
  if (ctx.runExists) {
    return {
      accept: false,
      validationStatus: "rejected",
      rejectReason: "duplicate_run",
      kind: "throw",
      deltas: null,
    };
  }

  // 3. user status 확인 - banned 거부
  if (ctx.userStatus === "banned") {
    return {
      accept: false,
      validationStatus: "rejected",
      rejectReason: "user_banned",
      kind: "throw",
      deltas: null,
    };
  }

  // 4. 프로젝트 존재 확인
  if (!ctx.projectExists) {
    return {
      accept: false,
      validationStatus: "rejected",
      rejectReason: "project_not_found",
      kind: "throw",
      deltas: null,
    };
  }

  // 5. 프로젝트 active + 동일 시즌 확인
  if (ctx.projectStatus !== "active" || ctx.projectSeasonId !== ctx.seasonId) {
    return {
      accept: false,
      validationStatus: "rejected",
      rejectReason: "project_inactive",
      kind: "throw",
      deltas: null,
    };
  }

  // 6. 점수 기본 검증
  const validation = validateScore(ctx.score);
  if (!validation.ok) {
    return {
      accept: false,
      validationStatus: "rejected",
      rejectReason: "invalid_score",
      kind: "persist_rejected",
      detail: validation.reason,
      deltas: null,
    };
  }

  // 7. 통과 - 집계 델타 계산
  const points = ctx.score.donationPoints;
  const isNewParticipant = !ctx.userExists;
  const isNewProjectParticipant = !ctx.hasPriorProjectContribution;

  return {
    accept: true,
    validationStatus: "confirmed",
    rejectReason: null,
    kind: null,
    deltas: {
      points,
      userTotalDonationPointsInc: points,
      userSeasonDonationPointsInc: points,
      isNewParticipant,
      projectConfirmedPointsInc: points,
      projectParticipantCountInc: isNewProjectParticipant ? 1 : 0,
      seasonTotalConfirmedPointsInc: points,
      ledger: {
        points,
        source: ctx.specialStageEntered ? "special_stage" : "normal_run",
        status: "confirmed",
      },
    },
  };
}
