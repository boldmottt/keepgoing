/**
 * 시즌 관련 callable 함수.
 */
import { onCall } from "firebase-functions/v2/https";
import { db } from "./common";
import { DonationProject, Season } from "./types";

/**
 * getActiveSeason() → { season, projects[] }
 * 현재 active 상태인 시즌과 해당 시즌의 active 프로젝트 목록을 반환한다.
 */
export const getActiveSeason = onCall(async () => {
  const seasonSnap = await db
    .collection("seasons")
    .where("status", "==", "active")
    .limit(1)
    .get();

  if (seasonSnap.empty) {
    return { season: null, projects: [] };
  }

  const seasonDoc = seasonSnap.docs[0];
  const season = { seasonId: seasonDoc.id, ...(seasonDoc.data() as Season) };

  const projectsSnap = await db
    .collection("donationProjects")
    .where("seasonId", "==", seasonDoc.id)
    .where("status", "==", "active")
    .get();

  const projects = projectsSnap.docs.map((d) => ({
    projectId: d.id,
    ...(d.data() as DonationProject),
  }));

  return { season, projects };
});
