/**
 * 사용자 프로필 관련 callable 함수.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db, requireAuth } from "./common";
import { DonationProject } from "./types";

/** 매우 단순한 욕설/금지어 필터 (MVP). */
const BANNED_WORDS = ["fuck", "shit", "bitch", "병신", "씨발", "시발", "개새", "좆", "지랄"];

function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase();
  return BANNED_WORDS.some((w) => lower.includes(w));
}

/**
 * setNickname({ nickname }) — 2~12자, 간단 욕설 필터.
 */
export const setNickname = onCall(async (req) => {
  const uid = requireAuth(req);
  const nickname = (req.data?.nickname ?? "").toString().trim();

  if (nickname.length < 2 || nickname.length > 12) {
    throw new HttpsError("invalid-argument", "닉네임은 2~12자여야 합니다.");
  }
  if (containsProfanity(nickname)) {
    throw new HttpsError("invalid-argument", "사용할 수 없는 닉네임입니다.");
  }

  const now = Timestamp.now();
  await db.collection("users").doc(uid).set(
    {
      nickname,
      lastLoginAt: now,
      // 최초 생성 시 기본값 보장
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { ok: true, nickname };
});

/**
 * setDefaultDonationProject({ projectId }) —
 * 프로젝트 존재/active/활성 시즌 소속 검증 후 기본 기부 프로젝트로 설정.
 */
export const setDefaultDonationProject = onCall(async (req) => {
  const uid = requireAuth(req);
  const projectId = (req.data?.projectId ?? "").toString();

  if (!projectId) {
    throw new HttpsError("invalid-argument", "projectId 가 필요합니다.");
  }

  const projectSnap = await db.collection("donationProjects").doc(projectId).get();
  if (!projectSnap.exists) {
    throw new HttpsError("not-found", "존재하지 않는 프로젝트입니다.");
  }
  const project = projectSnap.data() as DonationProject;
  if (project.status !== "active") {
    throw new HttpsError("failed-precondition", "활성 상태가 아닌 프로젝트입니다.");
  }

  // 프로젝트가 속한 시즌이 active 인지 확인
  const seasonSnap = await db.collection("seasons").doc(project.seasonId).get();
  if (!seasonSnap.exists || seasonSnap.data()?.status !== "active") {
    throw new HttpsError("failed-precondition", "활성 시즌의 프로젝트가 아닙니다.");
  }

  await db.collection("users").doc(uid).set(
    { defaultDonationProjectId: projectId },
    { merge: true }
  );

  return { ok: true, projectId };
});
