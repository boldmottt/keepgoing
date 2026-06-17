/**
 * 사용자 프로필 / 내 게임 기록 조회 callable 함수.
 * 본인(uid) 데이터만 반환하며, 개인 식별 정보(email 등)는 노출하지 않는다.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db, requireAuth } from "./common";

const DEFAULT_RUNS_LIMIT = 20;
const MAX_RUNS_LIMIT = 50;

/** getMyRuns 의 limit 파라미터를 안전 범위로 보정한다. */
export function clampRunsLimit(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    return DEFAULT_RUNS_LIMIT;
  }
  return Math.min(Math.floor(n), MAX_RUNS_LIMIT);
}

/** 클라이언트에 노출할 런 요약 형태. */
export interface PublicRunSummary {
  runId: string;
  gameScore: number;
  donationPoints: number;
  distanceMeters: number;
  durationSec: number;
  specialStageScore: number;
  obstaclesDodged: number;
  maxCombo: number;
  specialStageEntered: boolean;
  selectedProjectId: string | null;
  validationStatus: string;
  createdAtMillis: number | null;
}

/** Firestore 런 문서를 클라이언트 노출용 요약으로 변환한다. */
export function toRunSummary(
  runId: string,
  data: Record<string, unknown>
): PublicRunSummary {
  const createdAt = data.createdAt as { toMillis?: () => number } | undefined;
  return {
    runId,
    gameScore: Number(data.gameScore ?? 0),
    donationPoints: Number(data.donationPoints ?? 0),
    distanceMeters: Number(data.distanceMeters ?? 0),
    durationSec: Number(data.durationSec ?? 0),
    specialStageScore: Number(data.specialStageScore ?? 0),
    obstaclesDodged: Number(data.obstaclesDodged ?? 0),
    maxCombo: Number(data.maxCombo ?? 0),
    specialStageEntered: Boolean(data.specialStageEntered ?? false),
    selectedProjectId: (data.selectedProjectId as string) ?? null,
    validationStatus: (data.validationStatus as string) ?? "pending",
    createdAtMillis:
      typeof createdAt?.toMillis === "function" ? createdAt.toMillis() : null,
  };
}

/**
 * getUserProfile() → 본인 프로필.
 * 프로필/홈/마이페이지 화면용. 닉네임/아바타/포인트/기본 프로젝트/상태만 반환.
 */
export const getUserProfile = onCall(async (req) => {
  const uid = requireAuth(req);
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "사용자 프로필이 없습니다.");
  }
  const u = snap.data() ?? {};
  return {
    nickname: u.nickname ?? null,
    avatarId: u.avatarId ?? "0",
    defaultDonationProjectId: u.defaultDonationProjectId ?? null,
    totalDonationPoints: u.totalDonationPoints ?? 0,
    seasonDonationPoints: u.seasonDonationPoints ?? 0,
    status: u.status ?? "active",
  };
});

/**
 * getMyRuns({ limit }) → 본인 최근 게임 기록 목록.
 * 기본 20개, 최대 50개. runs 인덱스(uid asc, createdAt desc) 사용.
 */
export const getMyRuns = onCall(async (req) => {
  const uid = requireAuth(req);
  const limit = clampRunsLimit(req.data?.limit);

  const snap = await db
    .collection("runs")
    .where("uid", "==", uid)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  const runs = snap.docs.map((d) => toRunSummary(d.id, d.data()));
  return { runs };
});
