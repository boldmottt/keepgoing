/**
 * 공통 초기화 및 헬퍼.
 */
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, CallableRequest } from "firebase-functions/v2/https";

// Admin SDK 초기화 (중복 초기화 방지)
if (getApps().length === 0) {
  initializeApp();
}

export const db = getFirestore();

/** 인증된 요청인지 확인하고 uid 를 반환한다. */
export function requireAuth(req: CallableRequest): string {
  if (!req.auth || !req.auth.uid) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }
  return req.auth.uid;
}

/** 관리자(admin claim) 요청인지 확인한다. */
export function requireAdmin(req: CallableRequest): string {
  const uid = requireAuth(req);
  if (req.auth?.token?.admin !== true) {
    throw new HttpsError("permission-denied", "관리자 권한이 필요합니다.");
  }
  return uid;
}
