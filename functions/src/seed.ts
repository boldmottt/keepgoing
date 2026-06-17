/**
 * Firestore 시드 callable (관리자 전용).
 * firebase/seed/seed-data.json 의 사본(src/seed-data.json)을 읽어
 * season/projects/campaigns/specialStages 를 기록한다.
 * ISO 날짜 문자열은 Firestore Timestamp 로 변환한다.
 *
 * 호출 시 data 파라미터로 시드 JSON 을 직접 전달할 수도 있고,
 * 전달하지 않으면 번들된 기본 시드 데이터를 사용한다.
 */
import { onCall } from "firebase-functions/v2/https";
import { Timestamp } from "firebase-admin/firestore";
import { db, requireAdmin } from "./common";
import seedData from "./seed-data.json";

function ts(iso: string | null | undefined): Timestamp | null {
  if (!iso) return null;
  return Timestamp.fromDate(new Date(iso));
}

interface SeedShape {
  season: Record<string, unknown> & { seasonId: string; startAt: string; endAt: string };
  donationProjects: Array<Record<string, unknown> & { projectId: string }>;
  sponsorCampaigns: Array<
    Record<string, unknown> & { campaignId: string; startAt: string; endAt: string }
  >;
  specialStages: Array<Record<string, unknown> & { stageId: string }>;
}

export const seedFirestore = onCall(async (req) => {
  requireAdmin(req);

  const seed = ((req.data?.data as SeedShape) ?? (seedData as unknown as SeedShape));

  const batch = db.batch();
  const counts = { seasons: 0, projects: 0, campaigns: 0, stages: 0 };

  // 시즌
  const { seasonId, startAt, endAt, ...seasonRest } = seed.season;
  batch.set(db.collection("seasons").doc(seasonId), {
    ...seasonRest,
    startAt: ts(startAt),
    endAt: ts(endAt),
  });
  counts.seasons++;

  // 기부 프로젝트
  for (const p of seed.donationProjects ?? []) {
    const { projectId, ...rest } = p;
    batch.set(db.collection("donationProjects").doc(projectId), rest);
    counts.projects++;
  }

  // 후원 캠페인
  for (const c of seed.sponsorCampaigns ?? []) {
    const { campaignId, startAt: cs, endAt: ce, ...rest } = c;
    batch.set(db.collection("sponsorCampaigns").doc(campaignId), {
      ...rest,
      startAt: ts(cs),
      endAt: ts(ce),
    });
    counts.campaigns++;
  }

  // 특별 스테이지
  for (const s of seed.specialStages ?? []) {
    const { stageId, ...rest } = s;
    batch.set(db.collection("specialStages").doc(stageId), rest);
    counts.stages++;
  }

  await batch.commit();
  return { ok: true, counts };
});
