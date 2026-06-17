'use client';

// Cloud Functions(callable) 호출 래퍼.
// 함수 본체는 feature/firebase-backend 브랜치(functions/)에 정의되어 있다.
// 여기서는 함수 "이름"으로 callable 을 연결한다.
//
// Firebase 설정이 없으면 실제 호출 대신 mock 결과를 반환한다(개발/미연동 환경).
// TODO(firebase-backend): 백엔드 callable 시그니처가 확정되면 입력/출력 타입을 맞춘다.

import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseApp, isFirebaseConfigured } from './firebase';

export interface CallResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  mocked?: boolean;
}

export async function callFunction<T = unknown>(
  name: string,
  payload: Record<string, unknown> = {},
): Promise<CallResult<T>> {
  if (!isFirebaseConfigured) {
    // 미연동 환경: 호출을 흉내내고 성공으로 처리.
    // eslint-disable-next-line no-console
    console.info('[mock callFunction]', name, payload);
    return { ok: true, mocked: true, data: { name, payload } as unknown as T };
  }
  try {
    const app = getFirebaseApp();
    if (!app) return { ok: false, error: 'firebase not initialized' };
    const fns = getFunctions(app);
    const callable = httpsCallable(fns, name);
    const res = await callable(payload);
    return { ok: true, data: res.data as T };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// 관리자 callable 함수 이름 모음 (SPEC §5 / §17).
// 실제 함수명은 feature/firebase-backend 와 정렬 필요. TODO 로 표시.
export const ADMIN_FUNCTIONS = {
  upsertSeason: 'adminUpsertSeason', // TODO: 백엔드 함수명 확인
  upsertProject: 'adminUpsertProject', // TODO
  upsertCampaign: 'adminUpsertCampaign', // TODO
  upsertSpecialStage: 'adminUpsertSpecialStage', // TODO
  uploadDonationReport: 'adminUpsertDonationReport', // TODO
  reviewRun: 'adminReviewRun', // TODO: 의심 run 검수
  closeSeasonAndDistribute: 'adminCloseSeason', // TODO: 시즌 종료 배분 계산
} as const;
