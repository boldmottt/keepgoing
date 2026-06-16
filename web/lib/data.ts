// 데이터 접근 레이어.
// 기본은 로컬 mock 데이터(mockData.ts)로 동작하며, NEXT_PUBLIC_DATA_SOURCE=firebase 이고
// Firebase 설정이 있으면 Firestore 에서 읽도록 소스를 교체할 수 있다.
//
// Firestore 연동은 명세(SPEC §4)에 맞춘 컬렉션을 읽는 형태로 구현되어 있으나,
// 라이브 프로젝트 없이도 사이트가 렌더되도록 mock 폴백이 기본값이다.

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
} from 'firebase/firestore';

import { getDb, isFirebaseConfigured } from './firebase';
import {
  mockSeasons,
  mockProjects,
  mockSponsorCampaigns,
  mockSpecialStages,
  mockReports,
  mockLeaderboards,
  mockProjectContributors,
} from './mockData';
import type {
  Season,
  DonationProject,
  SponsorCampaign,
  SpecialStage,
  DonationReport,
  LeaderboardEntry,
  ProjectContributor,
} from './types';

function useFirebase(): boolean {
  const src = process.env.NEXT_PUBLIC_DATA_SOURCE;
  if (src === 'mock') return false;
  if (src === 'firebase') return isFirebaseConfigured;
  // 자동: 설정이 있으면 firebase, 없으면 mock.
  return isFirebaseConfigured;
}

async function fbDocs<T>(path: string, constraints: any[] = []): Promise<T[] | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const q = constraints.length
      ? query(collection(db, path), ...constraints)
      : query(collection(db, path));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as T);
  } catch {
    return null;
  }
}

async function fbDoc<T>(path: string, id: string): Promise<T | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, path, id));
    return snap.exists() ? (snap.data() as T) : null;
  } catch {
    return null;
  }
}

// ---- Seasons ----

export async function getSeasons(): Promise<Season[]> {
  if (useFirebase()) {
    const r = await fbDocs<Season>('seasons');
    if (r) return r;
  }
  return mockSeasons;
}

export async function getActiveSeason(): Promise<Season | null> {
  if (useFirebase()) {
    const r = await fbDocs<Season>('seasons', [where('status', '==', 'active')]);
    if (r && r.length) return r[0];
  }
  return mockSeasons.find((s) => s.status === 'active') ?? null;
}

export async function getSeason(seasonId: string): Promise<Season | null> {
  if (useFirebase()) {
    const r = await fbDoc<Season>('seasons', seasonId);
    if (r) return r;
  }
  return mockSeasons.find((s) => s.seasonId === seasonId) ?? null;
}

// ---- Projects ----

export async function getProjects(): Promise<DonationProject[]> {
  if (useFirebase()) {
    const r = await fbDocs<DonationProject>('donationProjects');
    if (r) return r;
  }
  return mockProjects;
}

export async function getProjectsBySeason(
  seasonId: string,
): Promise<DonationProject[]> {
  if (useFirebase()) {
    const r = await fbDocs<DonationProject>('donationProjects', [
      where('seasonId', '==', seasonId),
    ]);
    if (r) return r;
  }
  return mockProjects.filter((p) => p.seasonId === seasonId);
}

export async function getProject(
  projectId: string,
): Promise<DonationProject | null> {
  if (useFirebase()) {
    const r = await fbDoc<DonationProject>('donationProjects', projectId);
    if (r) return r;
  }
  return mockProjects.find((p) => p.projectId === projectId) ?? null;
}

// ---- Sponsor campaigns / special stages ----

export async function getSponsorCampaigns(): Promise<SponsorCampaign[]> {
  if (useFirebase()) {
    const r = await fbDocs<SponsorCampaign>('sponsorCampaigns');
    if (r) return r;
  }
  return mockSponsorCampaigns;
}

export async function getSponsorCampaignsByProject(
  projectId: string,
): Promise<SponsorCampaign[]> {
  const all = await getSponsorCampaigns();
  return all.filter((c) => c.linkedProjectIds.includes(projectId));
}

export async function getSpecialStages(): Promise<SpecialStage[]> {
  if (useFirebase()) {
    const r = await fbDocs<SpecialStage>('specialStages');
    if (r) return r;
  }
  return mockSpecialStages;
}

// ---- Leaderboard ----

export async function getSeasonLeaderboard(
  seasonId: string,
): Promise<LeaderboardEntry[]> {
  if (useFirebase()) {
    const r = await fbDocs<LeaderboardEntry>(
      `leaderboards/${seasonId}/entries`,
      [orderBy('rank', 'asc')],
    );
    if (r) return r;
  }
  return mockLeaderboards[seasonId] ?? [];
}

export async function getProjectContributors(
  projectId: string,
): Promise<ProjectContributor[]> {
  if (useFirebase()) {
    const r = await fbDocs<ProjectContributor>(
      `projectLeaderboards/${projectId}/entries`,
      [orderBy('rank', 'asc')],
    );
    if (r) return r;
  }
  return mockProjectContributors[projectId] ?? [];
}

// ---- Reports ----

export async function getReports(): Promise<DonationReport[]> {
  if (useFirebase()) {
    const r = await fbDocs<DonationReport>('donationReports', [
      where('published', '==', true),
    ]);
    if (r) return r;
  }
  return mockReports.filter((r) => r.published);
}

export async function getReport(
  reportId: string,
): Promise<DonationReport | null> {
  if (useFirebase()) {
    const r = await fbDoc<DonationReport>('donationReports', reportId);
    if (r) return r;
  }
  return mockReports.find((r) => r.reportId === reportId) ?? null;
}

// ---- Aggregates (홈 누적 현황) ----

export interface SiteStats {
  totalDonationAmount: number; // 누적 실제/예상 기부금
  totalPoints: number; // 누적 확정 포인트
  totalPlays: number; // 누적 플레이 수 (더미)
}

export async function getSiteStats(): Promise<SiteStats> {
  const seasons = await getSeasons();
  const totalPoints = seasons.reduce((s, x) => s + x.totalConfirmedPoints, 0);
  const totalDonationAmount = seasons.reduce(
    (s, x) => s + x.totalEstimatedDonationAmount,
    0,
  );
  // 플레이 수는 별도 집계 컬렉션이 필요하나 MVP 에서는 포인트 기반 추정 더미.
  const totalPlays = Math.round(totalPoints / 250);
  return { totalDonationAmount, totalPoints, totalPlays };
}
