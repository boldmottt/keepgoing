// SPEC §4 Firestore 컬렉션 필드 요약 기반 공유 타입.

export type SeasonStatus = 'draft' | 'active' | 'closed' | 'donated';

export interface Season {
  seasonId: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  status: SeasonStatus;
  donationPoolAmount: number;
  totalConfirmedPoints: number;
  totalEstimatedDonationAmount: number;
}

export type ProjectStatus = 'active' | 'inactive' | 'completed';

export interface DonationProject {
  projectId: string;
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

export type CampaignStatus = 'draft' | 'active' | 'ended';

export interface SponsorCampaign {
  campaignId: string;
  seasonId: string;
  sponsorName: string;
  brandName: string;
  title: string;
  description: string;
  linkedProjectIds: string[];
  donationPoolAmount: number;
  startAt: string;
  endAt: string;
  status: CampaignStatus;
}

export type SpecialStageStatus = 'active' | 'inactive';

export interface SpecialStage {
  stageId: string;
  campaignId: string;
  stageName: string;
  theme: string;
  durationSec: number;
  scoreMultiplier: number;
  brandName: string;
  brandLogoUrl: string;
  assetBundleUrl: string | null;
  status: SpecialStageStatus;
}

export interface DonationReport {
  reportId: string;
  seasonId: string;
  projectId: string;
  organizationName: string;
  finalDonationAmount: number;
  donatedAt: string;
  proofFileUrl: string;
  receiptFileUrl: string;
  publicMemo: string;
  published: boolean;
}

export interface LeaderboardEntry {
  nickname: string;
  avatarId: string;
  totalPoints: number;
  mainProjectId: string;
  rank: number;
}

export interface ProjectContributor {
  nickname: string;
  avatarId: string;
  points: number;
  rank: number;
}
