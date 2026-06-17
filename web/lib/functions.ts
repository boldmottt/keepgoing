'use client';

// Cloud Functions(callable) 호출 래퍼.
// 함수 본체는 functions/src/admin.ts 에 정의되어 있다(리전: asia-northeast3).
// 여기서는 함수 "이름"으로 callable 을 연결하고, 입력 타입을 백엔드 시그니처에 맞춘다.
//
// Firebase 설정이 없으면 실제 호출 대신 mock 결과를 반환한다(개발/미연동 데모 환경).

import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseApp, isFirebaseConfigured } from './firebase';

// functions/src/index.ts 의 setGlobalOptions({ region: "asia-northeast3" }) 와 일치.
const FUNCTIONS_REGION = 'asia-northeast3';

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
    const fns = getFunctions(app, FUNCTIONS_REGION);
    const callable = httpsCallable(fns, name);
    const res = await callable(payload);
    return { ok: true, data: res.data as T };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// 관리자 callable 함수 이름 모음.
// functions/src/index.ts 에서 export 되는 실제 이름과 1:1로 일치한다.
export const ADMIN_FUNCTIONS = {
  createSeason: 'createSeason',
  updateSeason: 'updateSeason',
  createProject: 'createProject',
  updateProject: 'updateProject',
  createSponsorCampaign: 'createSponsorCampaign',
  updateSponsorCampaign: 'updateSponsorCampaign',
  upsertSpecialStage: 'upsertSpecialStage',
  createDonationReport: 'createDonationReport',
  closeSeasonAndDistribute: 'closeSeasonAndDistribute',
  // 검수 (functions/src/review.ts)
  listSuspiciousUsers: 'listSuspiciousUsers',
  listRejectedRuns: 'listRejectedRuns',
  setUserStatus: 'setUserStatus',
  reviewRun: 'reviewRun',
} as const;

// ---------- 입력 타입 (functions/src/admin.ts 시그니처 기준) ----------
// 날짜 필드는 ISO 문자열로 전달하면 백엔드 toTimestamp() 가 Timestamp 로 변환한다.

/** createSeason({ seasonId?, ...fields }) / updateSeason({ seasonId, ...fields }) */
export interface SeasonInput {
  seasonId?: string;
  title?: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  status?: string;
  donationPoolAmount?: number;
}

/** createProject({ projectId?, ...fields }) / updateProject({ projectId, ...fields }) */
export interface ProjectInput {
  projectId?: string;
  seasonId?: string;
  title?: string;
  description?: string;
  organizationName?: string;
  imageUrl?: string;
  targetAmount?: number;
  status?: string;
}

/** createSponsorCampaign({ campaignId?, ...fields }) / updateSponsorCampaign({ campaignId, ...fields }) */
export interface CampaignInput {
  campaignId?: string;
  seasonId?: string;
  sponsorName?: string;
  brandName?: string;
  title?: string;
  description?: string;
  linkedProjectIds?: string[];
  donationPoolAmount?: number;
  startAt?: string;
  endAt?: string;
  status?: string;
}

/** upsertSpecialStage({ stageId?, ...fields }) */
export interface SpecialStageInput {
  stageId?: string;
  campaignId?: string;
  stageName?: string;
  theme?: string;
  durationSec?: number;
  scoreMultiplier?: number;
  brandName?: string;
  brandLogoUrl?: string;
  assetBundleUrl?: string | null;
  status?: string;
}

/** createDonationReport({ reportId?, ...fields }) */
export interface DonationReportInput {
  reportId?: string;
  seasonId?: string;
  projectId?: string;
  organizationName?: string;
  finalDonationAmount?: number;
  donatedAt?: string;
  proofFileUrl?: string;
  receiptFileUrl?: string;
  publicMemo?: string;
  published?: boolean;
}

// ---------- 타입드 래퍼 ----------

type Ok = { ok: boolean };

/** seasonId 가 있으면 updateSeason, 없으면 createSeason 으로 라우팅. */
export function saveSeason(input: SeasonInput) {
  const name = input.seasonId
    ? ADMIN_FUNCTIONS.updateSeason
    : ADMIN_FUNCTIONS.createSeason;
  return callFunction<Ok & { seasonId: string }>(name, { ...input });
}

/** projectId 가 있으면 updateProject, 없으면 createProject. */
export function saveProject(input: ProjectInput) {
  const name = input.projectId
    ? ADMIN_FUNCTIONS.updateProject
    : ADMIN_FUNCTIONS.createProject;
  return callFunction<Ok & { projectId: string }>(name, { ...input });
}

/** campaignId 가 있으면 updateSponsorCampaign, 없으면 createSponsorCampaign. */
export function saveSponsorCampaign(input: CampaignInput) {
  const name = input.campaignId
    ? ADMIN_FUNCTIONS.updateSponsorCampaign
    : ADMIN_FUNCTIONS.createSponsorCampaign;
  return callFunction<Ok & { campaignId: string }>(name, { ...input });
}

/** upsertSpecialStage 는 백엔드가 단일 upsert 로 처리한다. */
export function saveSpecialStage(input: SpecialStageInput) {
  return callFunction<Ok & { stageId: string }>(
    ADMIN_FUNCTIONS.upsertSpecialStage,
    { ...input },
  );
}

export function saveDonationReport(input: DonationReportInput) {
  return callFunction<Ok & { reportId: string }>(
    ADMIN_FUNCTIONS.createDonationReport,
    { ...input },
  );
}

export interface CloseSeasonResult {
  ok: boolean;
  seasonId: string;
  pool: number;
  totalPoints: number;
  totalEstimated: number;
  distribution: Array<{
    projectId: string;
    confirmedPoints: number;
    estimatedDonationAmount: number;
  }>;
}

export function closeSeasonAndDistribute(seasonId: string) {
  return callFunction<CloseSeasonResult>(
    ADMIN_FUNCTIONS.closeSeasonAndDistribute,
    { seasonId },
  );
}

// ---------- 검수 (functions/src/review.ts) ----------

export type AdminUserStatus = 'active' | 'banned' | 'suspicious';

export interface SuspiciousUser {
  uid: string;
  nickname: string;
  status: AdminUserStatus;
  fraudScore: number;
  totalDonationPoints: number;
  seasonDonationPoints: number;
}

export interface RejectedRun {
  runId: string;
  uid: string;
  seasonId: string | null;
  gameScore: number;
  donationPoints: number;
  rejectReason: string | null;
  selectedProjectId: string | null;
  createdAtMillis: number | null;
}

export function listSuspiciousUsers(limit?: number) {
  return callFunction<{ users: SuspiciousUser[] }>(
    ADMIN_FUNCTIONS.listSuspiciousUsers,
    limit ? { limit } : {},
  );
}

export function listRejectedRuns(limit?: number) {
  return callFunction<{ runs: RejectedRun[] }>(
    ADMIN_FUNCTIONS.listRejectedRuns,
    limit ? { limit } : {},
  );
}

export function setUserStatus(uid: string, status: AdminUserStatus) {
  return callFunction<{ ok: boolean; uid: string; status: AdminUserStatus }>(
    ADMIN_FUNCTIONS.setUserStatus,
    { uid, status },
  );
}

export function reviewRun(runId: string, action: 'confirm' | 'reject') {
  return callFunction<{ ok: boolean; runId: string; changed: boolean; status: string }>(
    ADMIN_FUNCTIONS.reviewRun,
    { runId, action },
  );
}
