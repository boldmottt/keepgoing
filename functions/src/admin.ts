/**
 * 관리자 전용 callable 함수 (request.auth.token.admin === true 필요).
 * 시즌/프로젝트/캠페인/특별스테이지/리포트 CRUD + 시즌 종료 배분 계산.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { Timestamp } from "firebase-admin/firestore";
import { db, requireAdmin } from "./common";
import { Season } from "./types";

/** ISO 날짜 문자열을 Firestore Timestamp 로 변환한다. */
function toTimestamp(value: unknown): Timestamp | undefined {
  if (value === undefined || value === null) return undefined;
  if (value instanceof Timestamp) return value;
  if (typeof value === "number") return Timestamp.fromMillis(value);
  if (typeof value === "string") {
    const d = new Date(value);
    if (isNaN(d.getTime())) {
      throw new HttpsError("invalid-argument", `잘못된 날짜 형식: ${value}`);
    }
    return Timestamp.fromDate(d);
  }
  throw new HttpsError("invalid-argument", "지원하지 않는 날짜 형식입니다.");
}

/** 객체에서 날짜 필드들을 Timestamp 로 변환한 새 객체를 반환한다. */
function convertDateFields<T extends Record<string, unknown>>(
  data: T,
  dateKeys: string[]
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...data };
  for (const key of dateKeys) {
    if (out[key] !== undefined) {
      out[key] = toTimestamp(out[key]);
    }
  }
  return out;
}

// ---------- 시즌 ----------

/** createSeason({ seasonId?, ...fields }) */
export const createSeason = onCall(async (req) => {
  requireAdmin(req);
  const { seasonId, ...fields } = req.data ?? {};
  const data = convertDateFields(fields, ["startAt", "endAt"]);
  const ref = seasonId
    ? db.collection("seasons").doc(seasonId.toString())
    : db.collection("seasons").doc();
  await ref.set(
    {
      totalConfirmedPoints: 0,
      totalEstimatedDonationAmount: 0,
      status: "draft",
      ...data,
    },
    { merge: true }
  );
  return { ok: true, seasonId: ref.id };
});

/** updateSeason({ seasonId, ...fields }) */
export const updateSeason = onCall(async (req) => {
  requireAdmin(req);
  const { seasonId, ...fields } = req.data ?? {};
  if (!seasonId) throw new HttpsError("invalid-argument", "seasonId 가 필요합니다.");
  const data = convertDateFields(fields, ["startAt", "endAt"]);
  await db.collection("seasons").doc(seasonId.toString()).set(data, { merge: true });
  return { ok: true, seasonId };
});

// ---------- 프로젝트 ----------

export const createProject = onCall(async (req) => {
  requireAdmin(req);
  const { projectId, ...fields } = req.data ?? {};
  const ref = projectId
    ? db.collection("donationProjects").doc(projectId.toString())
    : db.collection("donationProjects").doc();
  await ref.set(
    {
      confirmedPoints: 0,
      estimatedDonationAmount: 0,
      participantCount: 0,
      status: "active",
      ...fields,
    },
    { merge: true }
  );
  return { ok: true, projectId: ref.id };
});

export const updateProject = onCall(async (req) => {
  requireAdmin(req);
  const { projectId, ...fields } = req.data ?? {};
  if (!projectId) throw new HttpsError("invalid-argument", "projectId 가 필요합니다.");
  await db.collection("donationProjects").doc(projectId.toString()).set(fields, { merge: true });
  return { ok: true, projectId };
});

// ---------- 후원 캠페인 ----------

export const createSponsorCampaign = onCall(async (req) => {
  requireAdmin(req);
  const { campaignId, ...fields } = req.data ?? {};
  const data = convertDateFields(fields, ["startAt", "endAt"]);
  const ref = campaignId
    ? db.collection("sponsorCampaigns").doc(campaignId.toString())
    : db.collection("sponsorCampaigns").doc();
  await ref.set({ status: "draft", ...data }, { merge: true });
  return { ok: true, campaignId: ref.id };
});

export const updateSponsorCampaign = onCall(async (req) => {
  requireAdmin(req);
  const { campaignId, ...fields } = req.data ?? {};
  if (!campaignId) throw new HttpsError("invalid-argument", "campaignId 가 필요합니다.");
  const data = convertDateFields(fields, ["startAt", "endAt"]);
  await db.collection("sponsorCampaigns").doc(campaignId.toString()).set(data, { merge: true });
  return { ok: true, campaignId };
});

// ---------- 특별 스테이지 ----------

/** upsertSpecialStage({ stageId, ...fields }) */
export const upsertSpecialStage = onCall(async (req) => {
  requireAdmin(req);
  const { stageId, ...fields } = req.data ?? {};
  const ref = stageId
    ? db.collection("specialStages").doc(stageId.toString())
    : db.collection("specialStages").doc();
  await ref.set({ status: "active", ...fields }, { merge: true });
  return { ok: true, stageId: ref.id };
});

// ---------- 기부 리포트 ----------

/** createDonationReport({ reportId?, ...fields }) - 기부 증빙 리포트 업로드/생성 */
export const createDonationReport = onCall(async (req) => {
  requireAdmin(req);
  const { reportId, ...fields } = req.data ?? {};
  const data = convertDateFields(fields, ["donatedAt"]);
  const ref = reportId
    ? db.collection("donationReports").doc(reportId.toString())
    : db.collection("donationReports").doc();
  await ref.set({ published: false, ...data }, { merge: true });
  return { ok: true, reportId: ref.id };
});

// ---------- 시즌 종료 배분 ----------

/**
 * closeSeasonAndDistribute({ seasonId })
 * 시즌을 종료(closed)하고 프로젝트별 예상 기부액을 계산한다.
 *
 * 프로젝트 실제(예상) 기부액 =
 *   풀(donationPoolAmount) × (project.confirmedPoints / season.totalConfirmedPoints)
 */
export const closeSeasonAndDistribute = onCall(async (req) => {
  requireAdmin(req);
  const seasonId = (req.data?.seasonId ?? "").toString();
  if (!seasonId) throw new HttpsError("invalid-argument", "seasonId 가 필요합니다.");

  return db.runTransaction(async (tx) => {
    const seasonRef = db.collection("seasons").doc(seasonId);
    const seasonSnap = await tx.get(seasonRef);
    if (!seasonSnap.exists) {
      throw new HttpsError("not-found", "존재하지 않는 시즌입니다.");
    }
    const season = seasonSnap.data() as Season;

    const projectsSnap = await tx.get(
      db.collection("donationProjects").where("seasonId", "==", seasonId)
    );

    const pool = season.donationPoolAmount ?? 0;
    const totalPoints = season.totalConfirmedPoints ?? 0;

    const distribution: Array<{
      projectId: string;
      confirmedPoints: number;
      estimatedDonationAmount: number;
    }> = [];

    let totalEstimated = 0;
    for (const doc of projectsSnap.docs) {
      const p = doc.data();
      const confirmedPoints = p.confirmedPoints ?? 0;
      const estimated =
        totalPoints > 0
          ? Math.floor(pool * (confirmedPoints / totalPoints))
          : 0;
      totalEstimated += estimated;
      tx.set(
        doc.ref,
        { estimatedDonationAmount: estimated },
        { merge: true }
      );
      distribution.push({
        projectId: doc.id,
        confirmedPoints,
        estimatedDonationAmount: estimated,
      });
    }

    tx.set(
      seasonRef,
      {
        status: "closed",
        totalEstimatedDonationAmount: totalEstimated,
        closedAt: Timestamp.now(),
      },
      { merge: true }
    );

    return { ok: true, seasonId, pool, totalPoints, totalEstimated, distribution };
  });
});
