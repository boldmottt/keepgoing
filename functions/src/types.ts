/**
 * 킵고잉 / KeepGoing - Firestore 컬렉션 타입 정의
 * SPEC.md §4 의 필드 요약과 일치합니다.
 *
 * 주의: Firestore에 저장될 때 날짜 필드는 Timestamp 로 저장됩니다.
 * 여기서는 admin SDK 의 Timestamp 타입을 사용합니다.
 */
import { Timestamp } from "firebase-admin/firestore";

export type UserStatus = "active" | "banned" | "suspicious";
export type SeasonStatus = "draft" | "active" | "closed" | "donated";
export type ProjectStatus = "active" | "inactive" | "completed";
export type ValidationStatus = "pending" | "confirmed" | "rejected";
export type LedgerSource =
  | "normal_run"
  | "special_stage"
  | "event_bonus"
  | "admin_adjustment";
export type LedgerStatus = "pending" | "confirmed" | "rejected";
export type CampaignStatus = "draft" | "active" | "ended";
export type StageStatus = "active" | "inactive";

/** users/{uid} */
export interface User {
  nickname: string;
  avatarId: string;
  defaultDonationProjectId: string | null;
  totalDonationPoints: number;
  seasonDonationPoints: number;
  status: UserStatus;
  fraudScore: number;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
}

/** seasons/{seasonId} */
export interface Season {
  title: string;
  description: string;
  startAt: Timestamp;
  endAt: Timestamp;
  status: SeasonStatus;
  donationPoolAmount: number;
  totalConfirmedPoints: number;
  totalEstimatedDonationAmount: number;
}

/** donationProjects/{projectId} */
export interface DonationProject {
  seasonId: string;
  title: string;
  description: string;
  organizationName: string;
  imageUrl: string;
  targetAmount: number;
  confirmedPoints: number;
  estimatedDonationAmount: number;
  participantCount: number;
  status: ProjectStatus;
}

/** runs/{runId} */
export interface Run {
  uid: string;
  seasonId: string;
  startedAt: Timestamp;
  endedAt: Timestamp;
  durationSec: number;
  distanceMeters: number;
  gameScore: number;
  donationPoints: number;
  normalStageScore: number;
  specialStageScore: number;
  obstaclesDodged: number;
  maxCombo: number;
  specialStageEntered: boolean;
  selectedProjectId: string;
  validationStatus: ValidationStatus;
  rejectReason: string | null;
  clientVersion: string;
  createdAt: Timestamp;
}

/** donationPointLedger/{ledgerId} */
export interface LedgerEntry {
  uid: string;
  runId: string;
  seasonId: string;
  projectId: string;
  points: number;
  source: LedgerSource;
  status: LedgerStatus;
  createdAt: Timestamp;
  confirmedAt: Timestamp | null;
}

/** leaderboards/{seasonId}/entries/{uid} */
export interface SeasonLeaderboardEntry {
  nickname: string;
  avatarId: string;
  totalPoints: number;
  mainProjectId: string | null;
  rank: number;
}

/** projectLeaderboards/{projectId}/entries/{uid} */
export interface ProjectLeaderboardEntry {
  nickname: string;
  avatarId: string;
  points: number;
  rank: number;
}

/** sponsorCampaigns/{campaignId} */
export interface SponsorCampaign {
  seasonId: string;
  sponsorName: string;
  brandName: string;
  title: string;
  description: string;
  linkedProjectIds: string[];
  donationPoolAmount: number;
  startAt: Timestamp;
  endAt: Timestamp;
  status: CampaignStatus;
}

/** specialStages/{stageId} */
export interface SpecialStage {
  campaignId: string;
  stageName: string;
  theme: string;
  durationSec: number;
  scoreMultiplier: number;
  brandName: string;
  brandLogoUrl: string;
  assetBundleUrl: string | null;
  status: StageStatus;
}

/** donationReports/{reportId} */
export interface DonationReport {
  seasonId: string;
  projectId: string;
  organizationName: string;
  finalDonationAmount: number;
  donatedAt: Timestamp;
  proofFileUrl: string;
  receiptFileUrl: string;
  publicMemo: string;
  published: boolean;
}

/** finishRun 클라이언트 입력 */
export interface FinishRunInput {
  runId: string;
  distanceMeters: number;
  durationSec: number;
  gameScore: number;
  donationPoints: number;
  normalStageScore: number;
  specialStageScore: number;
  obstaclesDodged: number;
  maxCombo: number;
  specialStageEntered: boolean;
  selectedProjectId: string;
  clientVersion: string;
}
