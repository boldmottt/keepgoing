/**
 * 게임 런(run) 관련 callable 함수.
 * startRun / finishRun (SPEC.md §5, §14 의 10단계 플로우).
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { randomBytes, randomUUID } from "crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db, requireAuth } from "./common";
import { DonationProject, FinishRunInput, User } from "./types";
import { decideFinishRun, FinishRunRejectReason } from "./runLogic";

/** 가드 위반(throw) 사유를 기존과 동일한 HttpsError 로 변환한다. */
function rejectReasonToHttpsError(reason: FinishRunRejectReason): HttpsError {
  switch (reason) {
    case "no_active_season":
      return new HttpsError("failed-precondition", "진행 중인 시즌이 없습니다.");
    case "duplicate_run":
      return new HttpsError("already-exists", "이미 제출된 런입니다.");
    case "user_banned":
      return new HttpsError("permission-denied", "정지된 사용자입니다.");
    case "project_not_found":
      return new HttpsError("not-found", "존재하지 않는 프로젝트입니다.");
    case "project_inactive":
      return new HttpsError(
        "failed-precondition",
        "선택한 프로젝트가 활성 상태가 아닙니다."
      );
    default:
      return new HttpsError("failed-precondition", "처리할 수 없는 요청입니다.");
  }
}

/**
 * startRun({ clientVersion }) → { runId, serverSeed, startedAt }
 * 새 런을 시작한다. runId 와 서버 시드를 발급한다.
 */
export const startRun = onCall(async (req) => {
  requireAuth(req);
  const clientVersion = (req.data?.clientVersion ?? "unknown").toString();

  const runId = randomUUID();
  const serverSeed = randomBytes(16).toString("hex");
  const startedAt = Timestamp.now();

  // 활성 시즌 확인
  const seasonSnap = await db
    .collection("seasons")
    .where("status", "==", "active")
    .limit(1)
    .get();
  if (seasonSnap.empty) {
    throw new HttpsError("failed-precondition", "진행 중인 시즌이 없습니다.");
  }

  return {
    runId,
    serverSeed,
    startedAt: startedAt.toMillis(),
    clientVersion,
  };
});

/**
 * finishRun(...) — 10단계 플로우를 Firestore 트랜잭션으로 처리.
 *  1. active season 확인
 *  2. user status 확인 (banned 거부)
 *  3. selectedProject active 확인
 *  4. 점수 기본 검증
 *  5. runs 저장 (runId 중복 거부 - 멱등성)
 *  6. donationPointLedger 생성
 *  7. 유저 포인트 증가
 *  8. 프로젝트 포인트/참여자 증가
 *  9. 시즌 전체 포인트 증가
 * 10. 리더보드 갱신
 *
 * 검증 실패 시 runs 는 validationStatus="rejected" 로 저장하고 집계는 하지 않는다.
 */
export const finishRun = onCall(async (req) => {
  const uid = requireAuth(req);
  const input = req.data as FinishRunInput;

  if (!input?.runId) {
    throw new HttpsError("invalid-argument", "runId 가 필요합니다.");
  }
  if (!input.selectedProjectId) {
    throw new HttpsError("invalid-argument", "selectedProjectId 가 필요합니다.");
  }

  return db.runTransaction(async (tx) => {
    // --- 읽기 단계: 결정에 필요한 문서들을 읽는다 ---
    // 1. active season
    const seasonQuery = await tx.get(
      db.collection("seasons").where("status", "==", "active").limit(1)
    );
    const hasActiveSeason = !seasonQuery.empty;
    const seasonDoc = hasActiveSeason ? seasonQuery.docs[0] : null;
    const seasonId = seasonDoc ? seasonDoc.id : null;

    // runId 멱등성
    const runRef = db.collection("runs").doc(input.runId);
    const existingRun = await tx.get(runRef);

    // user status
    const userRef = db.collection("users").doc(uid);
    const userSnap = await tx.get(userRef);
    const user = userSnap.exists ? (userSnap.data() as User) : null;

    // selectedProject
    const projectRef = db
      .collection("donationProjects")
      .doc(input.selectedProjectId);
    const projectSnap = await tx.get(projectRef);
    const project = projectSnap.exists
      ? (projectSnap.data() as DonationProject)
      : null;

    // 이 유저의 해당 프로젝트 첫 기여 여부 (participantCount 증가 판단).
    // 트랜잭션 일관성을 위해 읽기 단계에서 함께 조회한다.
    const priorProjectLedger = await tx.get(
      db
        .collection("donationPointLedger")
        .where("uid", "==", uid)
        .where("projectId", "==", input.selectedProjectId)
        .where("status", "==", "confirmed")
        .limit(1)
    );

    // --- 순수 결정 ---
    const decision = decideFinishRun({
      hasActiveSeason,
      seasonId,
      runExists: existingRun.exists,
      userStatus: user?.status ?? null,
      userExists: userSnap.exists,
      projectExists: projectSnap.exists,
      projectStatus: project?.status ?? null,
      projectSeasonId: project?.seasonId ?? null,
      hasPriorProjectContribution: !priorProjectLedger.empty,
      score: {
        durationSec: input.durationSec,
        distanceMeters: input.distanceMeters,
        gameScore: input.gameScore,
        donationPoints: input.donationPoints,
      },
      specialStageEntered: !!input.specialStageEntered,
    });

    // 가드 위반: 기존과 동일한 HttpsError 로 던진다.
    if (decision.kind === "throw" && decision.rejectReason) {
      throw rejectReasonToHttpsError(decision.rejectReason);
    }

    const now = Timestamp.now();

    // 검증 실패: rejected 로 저장하고 집계 미반영
    if (decision.kind === "persist_rejected") {
      tx.set(runRef, {
        uid,
        seasonId: seasonId!,
        startedAt: now,
        endedAt: now,
        durationSec: input.durationSec ?? 0,
        distanceMeters: input.distanceMeters ?? 0,
        gameScore: input.gameScore ?? 0,
        donationPoints: input.donationPoints ?? 0,
        normalStageScore: input.normalStageScore ?? 0,
        specialStageScore: input.specialStageScore ?? 0,
        obstaclesDodged: input.obstaclesDodged ?? 0,
        maxCombo: input.maxCombo ?? 0,
        specialStageEntered: !!input.specialStageEntered,
        selectedProjectId: input.selectedProjectId,
        validationStatus: "rejected",
        rejectReason: "invalid_score",
        clientVersion: (input.clientVersion ?? "unknown").toString(),
        createdAt: now,
      });
      return {
        ok: false,
        runId: input.runId,
        validationStatus: "rejected",
        rejectReason: "invalid_score",
        detail: decision.detail,
      };
    }

    // 여기부터는 accept(confirmed). 위 가드를 모두 통과했으므로
    // seasonDoc/seasonId 및 집계 델타가 항상 존재한다.
    const deltas = decision.deltas!;
    const points = deltas.points;
    const activeSeasonDoc = seasonDoc!;
    const activeSeasonId = seasonId!;

    // 5. runs 저장 (confirmed)
    tx.set(runRef, {
      uid,
      seasonId: activeSeasonId,
      startedAt: now,
      endedAt: now,
      durationSec: input.durationSec,
      distanceMeters: input.distanceMeters,
      gameScore: input.gameScore,
      donationPoints: points,
      normalStageScore: input.normalStageScore ?? 0,
      specialStageScore: input.specialStageScore ?? 0,
      obstaclesDodged: input.obstaclesDodged ?? 0,
      maxCombo: input.maxCombo ?? 0,
      specialStageEntered: !!input.specialStageEntered,
      selectedProjectId: input.selectedProjectId,
      validationStatus: "confirmed",
      rejectReason: null,
      clientVersion: (input.clientVersion ?? "unknown").toString(),
      createdAt: now,
    });

    // 6. donationPointLedger 생성
    const ledgerRef = db.collection("donationPointLedger").doc();
    tx.set(ledgerRef, {
      uid,
      runId: input.runId,
      seasonId: activeSeasonId,
      projectId: input.selectedProjectId,
      points: deltas.ledger.points,
      source: deltas.ledger.source,
      status: deltas.ledger.status,
      createdAt: now,
      confirmedAt: now,
    });

    // 7. 유저 포인트 증가 (없으면 생성)
    tx.set(
      userRef,
      {
        totalDonationPoints: FieldValue.increment(deltas.userTotalDonationPointsInc),
        seasonDonationPoints: FieldValue.increment(deltas.userSeasonDonationPointsInc),
        status: user?.status ?? "active",
        lastLoginAt: now,
        ...(deltas.isNewParticipant
          ? { createdAt: now, nickname: user?.nickname ?? "", avatarId: user?.avatarId ?? "0" }
          : {}),
      },
      { merge: true }
    );

    // 8. 프로젝트 포인트/참여자 증가
    //    이 유저가 해당 프로젝트에 처음 기여하는 경우에만 participantCount 증가.
    tx.set(
      projectRef,
      {
        confirmedPoints: FieldValue.increment(deltas.projectConfirmedPointsInc),
        ...(deltas.projectParticipantCountInc > 0
          ? { participantCount: FieldValue.increment(deltas.projectParticipantCountInc) }
          : {}),
      },
      { merge: true }
    );

    // 9. 시즌 전체 포인트 증가
    tx.set(
      activeSeasonDoc.ref,
      { totalConfirmedPoints: FieldValue.increment(deltas.seasonTotalConfirmedPointsInc) },
      { merge: true }
    );

    // 10. 리더보드 갱신 (uid/email 미노출, 닉네임/아바타/포인트만)
    const nickname = user?.nickname ?? "익명";
    const avatarId = user?.avatarId ?? "0";

    const seasonLbRef = db
      .collection("leaderboards")
      .doc(activeSeasonId)
      .collection("entries")
      .doc(uid);
    tx.set(
      seasonLbRef,
      {
        nickname,
        avatarId,
        totalPoints: FieldValue.increment(points),
        mainProjectId: input.selectedProjectId,
        rank: 0, // rank 는 별도 배치/조회 시 계산
      },
      { merge: true }
    );

    const projectLbRef = db
      .collection("projectLeaderboards")
      .doc(input.selectedProjectId)
      .collection("entries")
      .doc(uid);
    tx.set(
      projectLbRef,
      {
        nickname,
        avatarId,
        points: FieldValue.increment(points),
        rank: 0,
      },
      { merge: true }
    );

    return {
      ok: true,
      runId: input.runId,
      validationStatus: "confirmed",
      donationPoints: points,
      seasonId: activeSeasonId,
      projectId: input.selectedProjectId,
    };
  });
});
