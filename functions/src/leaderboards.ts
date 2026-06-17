/**
 * 리더보드 조회 callable 함수.
 * uid/email 등 개인 식별 정보는 절대 노출하지 않는다.
 * status="suspicious"/"banned" 유저는 제외한다.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "./common";

const TOP_LIMIT = 100;

/** 제외 대상 유저(suspicious/banned)의 uid 집합을 만든다. */
export async function getExcludedUids(): Promise<Set<string>> {
  const excluded = new Set<string>();
  const snaps = await Promise.all([
    db.collection("users").where("status", "==", "banned").get(),
    db.collection("users").where("status", "==", "suspicious").get(),
  ]);
  for (const snap of snaps) {
    snap.docs.forEach((d) => excluded.add(d.id));
  }
  return excluded;
}

/**
 * getSeasonLeaderboard({ seasonId }) → { entries[] }
 */
export const getSeasonLeaderboard = onCall(async (req) => {
  const seasonId = (req.data?.seasonId ?? "").toString();
  if (!seasonId) {
    throw new HttpsError("invalid-argument", "seasonId 가 필요합니다.");
  }

  const excluded = await getExcludedUids();

  const snap = await db
    .collection("leaderboards")
    .doc(seasonId)
    .collection("entries")
    .orderBy("totalPoints", "desc")
    .limit(TOP_LIMIT + excluded.size)
    .get();

  const entries = snap.docs
    .filter((d) => !excluded.has(d.id))
    .slice(0, TOP_LIMIT)
    .map((d, idx) => {
      const data = d.data();
      // 개인 식별 정보 제외 - 닉네임/아바타/포인트만
      return {
        rank: idx + 1,
        nickname: data.nickname ?? "익명",
        avatarId: data.avatarId ?? "0",
        totalPoints: data.totalPoints ?? 0,
        mainProjectId: data.mainProjectId ?? null,
      };
    });

  return { entries };
});

/**
 * getProjectLeaderboard({ projectId }) → { entries[] }
 */
export const getProjectLeaderboard = onCall(async (req) => {
  const projectId = (req.data?.projectId ?? "").toString();
  if (!projectId) {
    throw new HttpsError("invalid-argument", "projectId 가 필요합니다.");
  }

  const excluded = await getExcludedUids();

  const snap = await db
    .collection("projectLeaderboards")
    .doc(projectId)
    .collection("entries")
    .orderBy("points", "desc")
    .limit(TOP_LIMIT + excluded.size)
    .get();

  const entries = snap.docs
    .filter((d) => !excluded.has(d.id))
    .slice(0, TOP_LIMIT)
    .map((d, idx) => {
      const data = d.data();
      return {
        rank: idx + 1,
        nickname: data.nickname ?? "익명",
        avatarId: data.avatarId ?? "0",
        points: data.points ?? 0,
      };
    });

  return { entries };
});
