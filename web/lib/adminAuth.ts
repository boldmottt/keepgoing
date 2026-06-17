'use client';

// 관리자 인증/권한 처리 (Firebase Email 로그인 + admin custom claim 확인).
// Firebase 미설정 환경에서는 "데모 모드"로 동작하여 UI 를 확인할 수 있게 한다.

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { getFirebaseApp, isFirebaseConfigured } from './firebase';

export interface AdminState {
  loading: boolean;
  user: { email: string | null } | null;
  isAdmin: boolean;
  demoMode: boolean;
}

/** admin custom claim 확인. 미설정 환경에서는 데모로 true. */
async function checkAdminClaim(user: User): Promise<boolean> {
  try {
    const token = await user.getIdTokenResult(true);
    return token.claims.admin === true;
  } catch {
    return false;
  }
}

export function subscribeAuth(cb: (state: AdminState) => void): () => void {
  if (!isFirebaseConfigured) {
    // 데모 모드: 백엔드 없이 관리자 UI 를 확인하기 위한 상태.
    cb({
      loading: false,
      user: { email: 'demo-admin@keepgoing.local' },
      isAdmin: true,
      demoMode: true,
    });
    return () => {};
  }
  const app = getFirebaseApp();
  if (!app) {
    cb({ loading: false, user: null, isAdmin: false, demoMode: false });
    return () => {};
  }
  const auth = getAuth(app);
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      cb({ loading: false, user: null, isAdmin: false, demoMode: false });
      return;
    }
    const isAdmin = await checkAdminClaim(user);
    cb({
      loading: false,
      user: { email: user.email },
      isAdmin,
      demoMode: false,
    });
  });
}

export async function adminSignIn(
  email: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!isFirebaseConfigured) {
    return { ok: true }; // 데모 모드: 항상 통과.
  }
  try {
    const app = getFirebaseApp();
    if (!app) return { ok: false, error: 'firebase not initialized' };
    const auth = getAuth(app);
    await signInWithEmailAndPassword(auth, email, password);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function adminSignOut(): Promise<void> {
  if (!isFirebaseConfigured) return;
  const app = getFirebaseApp();
  if (!app) return;
  await fbSignOut(getAuth(app));
}
