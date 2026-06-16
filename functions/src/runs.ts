/**
 * 게임 런(run) 관련 callable 함수.
 * startRun / finishRun (SPEC.md §5, §14 의 10단계 플로우).
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { randomBytes, randomUUID } from "crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db, requireAuth } from "./common";
import { DonationProject, FinishRunInput, User } from "./types";
import { validateScore } from "./validation";

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
    // 1. active season 확인
    const seasonQuery = await tx.get(
      db.collection("seasons").where("status", "==", "active").limit(1)
    );
    if (seasonQuery.empty) {
      throw new HttpsError("failed-precondition", "진행 중인 시즌이 없습니다.");
    }
    const seasonDoc = seasonQuery.docs[0];
    const seasonId = seasonDoc.id;

    // 5(선): runId 멱등성 확인 - 중복 제출 거부
    const runRef = db.collection("runs").doc(input.runId);
    const existingRun = await tx.get(runRef);
    if (existingRun.exists) {
      throw new HttpsError("already-exists", "이미 제출된 런입니다.");
    }

    // 2. user status 확인
    const userRef = db.collection("users").doc(uid);
    const userSnap = await tx.get(userRef);
    const user = userSnap.exists ? (userSnap.data() as User) : null;
    if (user?.status === "banned") {
      throw new HttpsError("permission-denied", "정지된 사용자입니다.");
    }

    // 3. selectedProject active 확인
    const projectRef = db
      .collection("donationProjects")
      .doc(input.selectedProjectId);
    const projectSnap = await tx.get(projectRef);
    if (!projectSnap.exists) {
      throw new HttpsError("not-found", "존재하지 않는 프로젝트입니다.");
    }
    const project = projectSnap.data() as DonationProject;
    if (project.status !== "active" || project.seasonId !== seasonId) {
      throw new HttpsError(
        "failed-precondition",
        "선택한 프로젝트가 활성 상태가 아닙니다."
      );
    }

    // 4. 점수 기본 검증
    const validation = validateScore({
      durationSec: input.durationSec,
      distanceMeters: input.distanceMeters,
      gameScore: input.gameScore,
      donationPoints: input.donationPoints,
    });

    const now = Timestamp.now();

    // 검증 실패: rejected 로 저장하고 집계 미반영
    if (!validation.ok) {
      tx.set(runRef, {
        uid,
        seasonId,
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
        detail: validation.reason,
      };
    }

    const points = input.donationPoints;

    // 5. runs 저장 (confirmed)
    tx.set(runRef, {
      uid,
      seasonId,
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
      seasonId,
      projectId: input.selectedProjectId,
      points,
      source: input.specialStageEntered ? "special_stage" : "normal_run",
      status: "confirmed",
      createdAt: now,
      confirmedAt: now,
    });

    // 7. 유저 포인트 증가 (없으면 생성)
    const isNewParticipant = !userSnap.exists;
    tx.set(
      userRef,
      {
        totalDonationPoints: FieldValue.increment(points),
        seasonDonationPoints: FieldValue.increment(points),
        status: user?.status ?? "active",
        lastLoginAt: now,
        ...(isNewParticipant
          ? { createdAt: now, nickname: user?.nickname ?? "", avatarId: user?.avatarId ?? "0" }
          : {}),
      },
      { merge: true }
    );

    // 8. 프로젝트 포인트/참여자 증가
    //    이 유저가 해당 프로젝트에 처음 기여하는 경우에만 participantCount 증가.
    const priorProjectLedger = await tx.get(
      db
        .collection("donationPointLedger")
        .where("uid", "==", uid)
        .where("projectId", "==", input.selectedProjectId)
        .where("status", "==", "confirmed")
        .limit(1)
    );
    const isNewProjectParticipant = priorProjectLedger.empty;
    tx.set(
      projectRef,
      {
        confirmedPoints: FieldValue.increment(points),
        ...(isNewProjectParticipant
          ? { participantCount: FieldValue.increment(1) }
          : {}),
      },
      { merge: true }
    );

    // 9. 시즌 전체 포인트 증가
    tx.set(
      seasonDoc.ref,
      { totalConfirmedPoints: FieldValue.increment(points) },
      { merge: true }
    );

    // 10. 리더보드 갱신 (uid/email 미노출, 닉네임/아바타/포인트만)
    const nickname = user?.nickname ?? "익명";
    const avatarId = user?.avatarId ?? "0";

    const seasonLbRef = db
      .collection("leaderboards")
      .doc(seasonId)
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
      seasonId,
      projectId: input.selectedProjectId,
    };
  });
});
