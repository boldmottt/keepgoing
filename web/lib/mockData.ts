// firebase/seed/seed-data.json 의 더미 데이터를 웹에서 바로 렌더링하기 위한 로컬 복사본.
// 라이브 Firebase 프로젝트 없이도 사이트가 동작하도록 한다.
// 추가로 리더보드/리포트/기여자 등 화면 구성을 위한 보강 더미 데이터를 포함한다.

import type {
  Season,
  DonationProject,
  SponsorCampaign,
  SpecialStage,
  DonationReport,
  LeaderboardEntry,
  ProjectContributor,
} from './types';

export const mockSeasons: Season[] = [
  {
    seasonId: 'beta-season-1',
    title: '킵고잉 베타 시즌 1',
    description:
      '킵고잉의 첫 베타 시즌입니다. 달리고, 피하고, 모아서 기부 포인트를 쌓아보세요.',
    startAt: '2026-07-01T00:00:00Z',
    endAt: '2026-07-31T23:59:59Z',
    status: 'active',
    donationPoolAmount: 1000000,
    totalConfirmedPoints: 1850000,
    totalEstimatedDonationAmount: 1000000,
  },
  {
    seasonId: 'pre-season-0',
    title: '킵고잉 프리 시즌 0',
    description: '비공개 테스트로 진행된 첫 시즌입니다. 실제 기부가 완료되었습니다.',
    startAt: '2026-05-01T00:00:00Z',
    endAt: '2026-05-31T23:59:59Z',
    status: 'donated',
    donationPoolAmount: 500000,
    totalConfirmedPoints: 920000,
    totalEstimatedDonationAmount: 500000,
  },
];

export const mockProjects: DonationProject[] = [
  {
    projectId: 'project-animals',
    seasonId: 'beta-season-1',
    title: '유기동물 보호',
    description: '버려진 동물들에게 안전한 보금자리와 치료를 제공합니다.',
    organizationName: '함께동물보호소',
    imageUrl: '',
    targetAmount: 500000,
    confirmedPoints: 920000,
    estimatedDonationAmount: 497297,
    participantCount: 412,
    status: 'active',
  },
  {
    projectId: 'project-children',
    seasonId: 'beta-season-1',
    title: '결식아동 식사 지원',
    description: '끼니를 거르는 아이들에게 따뜻한 한 끼를 전합니다.',
    organizationName: '따뜻한한끼재단',
    imageUrl: '',
    targetAmount: 300000,
    confirmedPoints: 610000,
    estimatedDonationAmount: 329730,
    participantCount: 287,
    status: 'active',
  },
  {
    projectId: 'project-forest',
    seasonId: 'beta-season-1',
    title: '숲 복원 프로젝트',
    description: '훼손된 숲에 나무를 심어 생태계를 되살립니다.',
    organizationName: '초록숲협회',
    imageUrl: '',
    targetAmount: 200000,
    confirmedPoints: 320000,
    estimatedDonationAmount: 172973,
    participantCount: 156,
    status: 'active',
  },
  {
    projectId: 'project-prior-children',
    seasonId: 'pre-season-0',
    title: '결식아동 식사 지원 (프리시즌)',
    description: '프리 시즌에 진행되어 실제 기부가 완료된 프로젝트입니다.',
    organizationName: '따뜻한한끼재단',
    imageUrl: '',
    targetAmount: 500000,
    confirmedPoints: 920000,
    estimatedDonationAmount: 500000,
    participantCount: 240,
    status: 'completed',
  },
];

export const mockSponsorCampaigns: SponsorCampaign[] = [
  {
    campaignId: 'campaign-keepgreen',
    seasonId: 'beta-season-1',
    sponsorName: 'KEEP GREEN (가상)',
    brandName: 'KEEP GREEN',
    title: '초록 에너지 캠페인',
    description: '숲 복원 프로젝트를 후원하는 가상 브랜드 캠페인입니다.',
    linkedProjectIds: ['project-forest'],
    donationPoolAmount: 0,
    startAt: '2026-07-01T00:00:00Z',
    endAt: '2026-07-31T23:59:59Z',
    status: 'active',
  },
];

export const mockSpecialStages: SpecialStage[] = [
  {
    stageId: 'stage-green-energy',
    campaignId: 'campaign-keepgreen',
    stageName: '초록 에너지 스테이지',
    theme: 'forest',
    durationSec: 15,
    scoreMultiplier: 1,
    brandName: 'KEEP GREEN',
    brandLogoUrl: '',
    assetBundleUrl: null,
    status: 'active',
  },
];

export const mockReports: DonationReport[] = [
  {
    reportId: 'report-preseason-children',
    seasonId: 'pre-season-0',
    projectId: 'project-prior-children',
    organizationName: '따뜻한한끼재단',
    finalDonationAmount: 500000,
    donatedAt: '2026-06-05T00:00:00Z',
    proofFileUrl: '',
    receiptFileUrl: '',
    publicMemo:
      '프리 시즌 0 종료 후 확정 포인트 비율에 따라 산정된 시즌 기부금 풀 전액을 전달했습니다.',
    published: true,
  },
];

// 리더보드 항목 (닉네임만, 개인정보 노출 금지)
export const mockLeaderboards: Record<string, LeaderboardEntry[]> = {
  'beta-season-1': [
    { nickname: '달려라하니', avatarId: 'a1', totalPoints: 124000, mainProjectId: 'project-animals', rank: 1 },
    { nickname: '점프왕', avatarId: 'a2', totalPoints: 98000, mainProjectId: 'project-children', rank: 2 },
    { nickname: '숲지킴이', avatarId: 'a3', totalPoints: 87500, mainProjectId: 'project-forest', rank: 3 },
    { nickname: '콤보마스터', avatarId: 'a4', totalPoints: 76000, mainProjectId: 'project-animals', rank: 4 },
    { nickname: '러닝버디', avatarId: 'a5', totalPoints: 64200, mainProjectId: 'project-children', rank: 5 },
    { nickname: '골드러시', avatarId: 'a6', totalPoints: 51000, mainProjectId: 'project-animals', rank: 6 },
    { nickname: '하트수집가', avatarId: 'a7', totalPoints: 43800, mainProjectId: 'project-forest', rank: 7 },
    { nickname: '니어미스', avatarId: 'a8', totalPoints: 39000, mainProjectId: 'project-children', rank: 8 },
  ],
  'pre-season-0': [
    { nickname: '얼리버드', avatarId: 'b1', totalPoints: 88000, mainProjectId: 'project-prior-children', rank: 1 },
    { nickname: '테스터원', avatarId: 'b2', totalPoints: 72000, mainProjectId: 'project-prior-children', rank: 2 },
  ],
};

// 프로젝트별 상위 기여자 (닉네임만)
export const mockProjectContributors: Record<string, ProjectContributor[]> = {
  'project-animals': [
    { nickname: '달려라하니', avatarId: 'a1', points: 124000, rank: 1 },
    { nickname: '콤보마스터', avatarId: 'a4', points: 76000, rank: 2 },
    { nickname: '골드러시', avatarId: 'a6', points: 51000, rank: 3 },
  ],
  'project-children': [
    { nickname: '점프왕', avatarId: 'a2', points: 98000, rank: 1 },
    { nickname: '러닝버디', avatarId: 'a5', points: 64200, rank: 2 },
    { nickname: '니어미스', avatarId: 'a8', points: 39000, rank: 3 },
  ],
  'project-forest': [
    { nickname: '숲지킴이', avatarId: 'a3', points: 87500, rank: 1 },
    { nickname: '하트수집가', avatarId: 'a7', points: 43800, rank: 2 },
  ],
  'project-prior-children': [
    { nickname: '얼리버드', avatarId: 'b1', points: 88000, rank: 1 },
    { nickname: '테스터원', avatarId: 'b2', points: 72000, rank: 2 },
  ],
};
