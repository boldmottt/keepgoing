/**
 * 오늘의 기부 포인트 리더보드 (SPEC §11 우선순위 3).
 *
 * 기준: KST(UTC+9) 자정 이후의 confirmed run 들의 donationPoints 를 유저별로 합산.
 * raw score 가 아니라 확정(confirmed) 포인트만 집계하며,
 * suspicious/banned 유저는 제외한다. 닉네임만 공개(개인정보 미노출).
 */
import { onCall } from "firebase-functions/v2/https";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "./common";
import { getExcludedUids } from "./leaderboards";

const TOP_LIMIT = 100;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 주어진 시각(UTC millis)이 속한 KST 하루의 시작(UTC millis)을 반환한다. */
export function startOfKstDayMillis(nowMillis: number): number {
  const kst = nowMillis + KST_OFFSET_MS;
  const kstDayStart = Math.floor(kst / DAY_MS) * DAY_MS;
  return kstDayStart - KST_OFFSET_MS;
}

/** {uid, donationPoints} 행들을 유저별 합계로 집계한다. */
export function aggregateDailyPoints(
  rows: Array<{ uid: string; donationPoints: number }>
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const r of rows) {
    if (!r.uid) continue;
    const pts = Number(r.donationPoints) || 0;
    totals.set(r.uid, (totals.get(r.uid) ?? 0) + pts);
  }
  return totals;
}

/** 합계 맵에서 제외 유저를 빼고 포인트 내림차순 상위 N명을 반환한다. */
export function topN(
  totals: Map<string, number>,
  excluded: Set<string>,
  limit: number
): Array<{ uid: string; points: number }> {
  return Array.from(totals.entries())
    .filter(([uid]) => !excluded.has(uid))
    .map(([uid, points]) => ({ uid, points }))
    .sort((a, b) => b.points - a.points)
    .slice(0, limit);
}

/**
 * getDailyLeaderboard({ seasonId?, limit? }) → { dayStartMillis, entries[] }
 * entries: { rank, nickname, avatarId, points }
 */
export const getDailyLeaderboard = onCall(async (req) => {
  const seasonId = req.data?.seasonId ? String(req.data.seasonId) : null;
  const limit = Math.min(Number(req.data?.limit) || TOP_LIMIT, TOP_LIMIT);

  const dayStart = startOfKstDayMillis(Date.now());
  const startTs = Timestamp.fromMillis(dayStart);

  const snap = await db
    .collection("runs")
    .where("validationStatus", "==", "confirmed")
    .where("createdAt", ">=", startTs)
    .get();

  const rows = snap.docs
    .map((d) => d.data())
    .filter((r) => (seasonId ? r.seasonId === seasonId : true))
    .map((r) => ({
      uid: String(r.uid ?? ""),
      donationPoints: Number(r.donationPoints ?? 0),
    }));

  const totals = aggregateDailyPoints(rows);
  const excluded = await getExcludedUids();
  const top = topN(totals, excluded, limit);

  // 상위 유저의 닉네임/아바타만 조회 (uid 미노출)
  const userSnaps = await Promise.all(
    top.map((t) => db.collection("users").doc(t.uid).get())
  );

  const entries = top.map((t, idx) => {
    const u = userSnaps[idx].data() ?? {};
    return {
      rank: idx + 1,
      nickname: u.nickname ?? "익명",
      avatarId: u.avatarId ?? "0",
      points: t.points,
    };
  });

  return { dayStartMillis: dayStart, entries };
});
