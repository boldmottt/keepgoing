/**
 * 관리자 검수(moderation) callable (request.auth.token.admin === true 필요).
 * SPEC §17 "유저/기록 검수": 의심 유저/거부 런 조회, 유저 상태 변경, 런 재검수.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db, requireAdmin } from "./common";
import { UserStatus, ValidationStatus } from "./types";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const VALID_USER_STATUSES: UserStatus[] = ["active", "banned", "suspicious"];

/** limit 파라미터를 안전 범위로 보정한다. */
export function clampLimit(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(n), MAX_LIMIT);
}

/** 입력 상태값을 검증한다. 잘못된 값이면 null. */
export function normalizeUserStatus(raw: unknown): UserStatus | null {
  return VALID_USER_STATUSES.includes(raw as UserStatus)
    ? (raw as UserStatus)
    : null;
}

/** 재검수 액션을 목표 validationStatus 로 변환한다. */
export function actionToTargetStatus(
  action: unknown
): "confirmed" | "rejected" | null {
  if (action === "confirm") return "confirmed";
  if (action === "reject") return "rejected";
  return null;
}

export interface ReviewAdjustment {
  changed: boolean;
  /** 집계에 더할 포인트 변화량(+points 확정 / -points 확정취소 / 0) */
  pointsDelta: number;
  /** 이번 전환이 '확정'인지 '확정취소'인지 (participantCount 판단용) */
  direction: "confirm" | "unconfirm" | "none";
  targetStatus: "confirmed" | "rejected";
}

/**
 * 런 재검수에 따른 포인트 집계 조정량을 계산한다(순수 함수).
 *
 * - 미반영(pending/rejected) → confirmed : +points (확정)
 * - confirmed → rejected               : -points (확정취소)
 * - 그 외 동일 상태 전환                : 변화 없음
 *   (pending → rejected 는 애초에 집계 안 됐으므로 0)
 */
export function computeReviewAdjustment(
  current: ValidationStatus,
  target: "confirmed" | "rejected",
  points: number
): ReviewAdjustment {
  const pts = Number(points) || 0;
  if (current === target) {
    return { changed: false, pointsDelta: 0, direction: "none", targetStatus: target };
  }
  if (target === "confirmed") {
    return { changed: true, pointsDelta: pts, direction: "confirm", targetStatus: target };
  }
  // target === "rejected"
  const wasCounted = current === "confirmed";
  return {
    changed: true,
    pointsDelta: wasCounted ? -pts : 0,
    direction: wasCounted ? "unconfirm" : "none",
    targetStatus: target,
  };
}

/**
 * participantCount 변화량을 계산한다(순수 함수).
 * - confirm  : 이 프로젝트에 다른 확정 기여가 없었다면 +1
 * - unconfirm: 이 런 외에 다른 확정 기여가 남지 않는다면 -1
 */
export function participantCountDelta(
  direction: "confirm" | "unconfirm" | "none",
  hasOtherConfirmed: boolean
): number {
  if (direction === "confirm") return hasOtherConfirmed ? 0 : 1;
  if (direction === "unconfirm") return hasOtherConfirmed ? 0 : -1;
  return 0;
}

// ---------- 조회 ----------

/** listSuspiciousUsers({ limit? }) → { users[] } (suspicious/banned) */
export const listSuspiciousUsers = onCall(async (req) => {
  requireAdmin(req);
  const limit = clampLimit(req.data?.limit);

  const snaps = await Promise.all([
    db.collection("users").where("status", "==", "suspicious").limit(limit).get(),
    db.collection("users").where("status", "==", "banned").limit(limit).get(),
  ]);

  const users = snaps
    .flatMap((s) => s.docs)
    .map((d) => {
      const u = d.data();
      return {
        uid: d.id,
        nickname: u.nickname ?? "",
        status: u.status ?? "active",
        fraudScore: u.fraudScore ?? 0,
        totalDonationPoints: u.totalDonationPoints ?? 0,
        seasonDonationPoints: u.seasonDonationPoints ?? 0,
      };
    });

  return { users };
});

/** listRejectedRuns({ limit? }) → { runs[] } */
export const listRejectedRuns = onCall(async (req) => {
  requireAdmin(req);
  const limit = clampLimit(req.data?.limit);

  const snap = await db
    .collection("runs")
    .where("validationStatus", "==", "rejected")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  const runs = snap.docs.map((d) => {
    const r = d.data();
    const createdAt = r.createdAt as { toMillis?: () => number } | undefined;
    return {
      runId: d.id,
      uid: r.uid ?? "",
      seasonId: r.seasonId ?? null,
      gameScore: r.gameScore ?? 0,
      donationPoints: r.donationPoints ?? 0,
      rejectReason: r.rejectReason ?? null,
      selectedProjectId: r.selectedProjectId ?? null,
      createdAtMillis:
        typeof createdAt?.toMillis === "function" ? createdAt.toMillis() : null,
    };
  });

  return { runs };
});

// ---------- 유저 상태 변경 ----------

/** setUserStatus({ uid, status }) — active | banned | suspicious */
export const setUserStatus = onCall(async (req) => {
  requireAdmin(req);
  const uid = (req.data?.uid ?? "").toString();
  const status = normalizeUserStatus(req.data?.status);
  if (!uid) throw new HttpsError("invalid-argument", "uid 가 필요합니다.");
  if (!status) {
    throw new HttpsError(
      "invalid-argument",
      "status 는 active|banned|suspicious 중 하나여야 합니다."
    );
  }

  const ref = db.collection("users").doc(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "존재하지 않는 사용자입니다.");
  }
  await ref.set({ status, statusUpdatedAt: Timestamp.now() }, { merge: true });
  return { ok: true, uid, status };
});

// ---------- 런 재검수 ----------

/**
 * reviewRun({ runId, action }) — action: "confirm" | "reject"
 * 거부된 런을 수동 확정하거나, 확정된(의심) 런을 거부 처리하며
 * 유저/프로젝트/시즌 포인트 집계와 리더보드를 일관되게 조정한다.
 */
export const reviewRun = onCall(async (req) => {
  requireAdmin(req);
  const runId = (req.data?.runId ?? "").toString();
  const target = actionToTargetStatus(req.data?.action);
  if (!runId) throw new HttpsError("invalid-argument", "runId 가 필요합니다.");
  if (!target) {
    throw new HttpsError("invalid-argument", "action 은 confirm|reject 여야 합니다.");
  }

  return db.runTransaction(async (tx) => {
    // --- 읽기 단계 ---
    const runRef = db.collection("runs").doc(runId);
    const runSnap = await tx.get(runRef);
    if (!runSnap.exists) {
      throw new HttpsError("not-found", "존재하지 않는 런입니다.");
    }
    const run = runSnap.data() as Record<string, unknown>;
    const current = (run.validationStatus as ValidationStatus) ?? "pending";
    const uid = String(run.uid ?? "");
    const projectId = String(run.selectedProjectId ?? "");
    const seasonId = String(run.seasonId ?? "");
    const points = Number(run.donationPoints ?? 0);

    const adj = computeReviewAdjustment(current, target, points);

    // 이 런의 기존 원장 (finishRun confirm 시 생성됨)
    const ledgerSnap = await tx.get(
      db.collection("donationPointLedger").where("runId", "==", runId).limit(1)
    );

    // participantCount 판단: 이 런을 제외한 다른 확정 기여 존재 여부
    let hasOtherConfirmed = false;
    if (adj.changed && adj.direction !== "none" && uid && projectId) {
      const otherSnap = await tx.get(
        db
          .collection("donationPointLedger")
          .where("uid", "==", uid)
          .where("projectId", "==", projectId)
          .where("status", "==", "confirmed")
          .limit(5)
      );
      hasOtherConfirmed = otherSnap.docs.some((d) => d.data().runId !== runId);
    }

    if (!adj.changed) {
      return { ok: true, runId, changed: false, status: current };
    }

    const now = Timestamp.now();

    // --- 쓰기 단계 ---
    // 1) 런 상태
    tx.set(
      runRef,
      {
        validationStatus: target,
        rejectReason:
          target === "rejected" ? run.rejectReason ?? "admin_rejected" : null,
        reviewedAt: now,
      },
      { merge: true }
    );

    // 2) 원장
    const ledgerStatus = target === "confirmed" ? "confirmed" : "rejected";
    if (!ledgerSnap.empty) {
      tx.set(
        ledgerSnap.docs[0].ref,
        {
          status: ledgerStatus,
          confirmedAt: target === "confirmed" ? now : null,
        },
        { merge: true }
      );
    } else if (target === "confirmed") {
      // 거부 런에는 원장이 없으므로 확정 시 새로 생성
      tx.set(db.collection("donationPointLedger").doc(), {
        uid,
        runId,
        seasonId,
        projectId,
        points,
        source: run.specialStageEntered ? "special_stage" : "normal_run",
        status: "confirmed",
        createdAt: now,
        confirmedAt: now,
      });
    }

    // 집계 조정 (pointsDelta 가 0 이 아닐 때만 의미)
    if (adj.pointsDelta !== 0) {
      // 3) 유저
      if (uid) {
        tx.set(
          db.collection("users").doc(uid),
          {
            totalDonationPoints: FieldValue.increment(adj.pointsDelta),
            seasonDonationPoints: FieldValue.increment(adj.pointsDelta),
          },
          { merge: true }
        );
      }
      // 5) 시즌
      if (seasonId) {
        tx.set(
          db.collection("seasons").doc(seasonId),
          { totalConfirmedPoints: FieldValue.increment(adj.pointsDelta) },
          { merge: true }
        );
      }
      // 6) 리더보드(시즌)
      if (seasonId && uid) {
        tx.set(
          db.collection("leaderboards").doc(seasonId).collection("entries").doc(uid),
          { totalPoints: FieldValue.increment(adj.pointsDelta), updatedAt: now },
          { merge: true }
        );
      }
      // 7) 리더보드(프로젝트)
      if (projectId && uid) {
        tx.set(
          db
            .collection("projectLeaderboards")
            .doc(projectId)
            .collection("entries")
            .doc(uid),
          { points: FieldValue.increment(adj.pointsDelta), updatedAt: now },
          { merge: true }
        );
      }
    }

    // 4) 프로젝트 (포인트 + 참여자 수)
    const pcDelta = participantCountDelta(adj.direction, hasOtherConfirmed);
    if (projectId && (adj.pointsDelta !== 0 || pcDelta !== 0)) {
      const projectUpdate: Record<string, unknown> = {};
      if (adj.pointsDelta !== 0) {
        projectUpdate.confirmedPoints = FieldValue.increment(adj.pointsDelta);
      }
      if (pcDelta !== 0) {
        projectUpdate.participantCount = FieldValue.increment(pcDelta);
      }
      tx.set(db.collection("donationProjects").doc(projectId), projectUpdate, {
        merge: true,
      });
    }

    return {
      ok: true,
      runId,
      changed: true,
      status: target,
      pointsDelta: adj.pointsDelta,
    };
  });
});
