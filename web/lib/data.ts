// 데이터 접근 레이어.
// 기본은 로컬 mock 데이터(mockData.ts)로 동작하며, NEXT_PUBLIC_DATA_SOURCE=firestore 이고
// Firebase 설정이 있으면 Cloud Firestore 에서 읽도록 소스를 교체할 수 있다.
//
// Firestore 연동은 명세(SPEC §4/§13)에 맞춘 컬렉션을 읽는 형태로 구현되어 있으나,
// 라이브 프로젝트 없이도 정적 빌드(output: 'export')가 렌더되도록 mock 폴백이 기본값이다.
// 읽기 실패(권한/네트워크/누락)에도 항상 mock 으로 폴백한다.

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  type DocumentData,
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

// 라이브 모드 판단.
// - NEXT_PUBLIC_DATA_SOURCE === 'firestore' 이고 Firebase env 가 설정되어 있어야 라이브.
// - 그 외(기본 'mock', 미설정, env 누락)에는 mock 으로 동작 → 정적 빌드 항상 성공.
// - 'firebase' 는 하위 호환을 위한 별칭으로 'firestore' 와 동일하게 취급한다.
function useFirestore(): boolean {
  const src = process.env.NEXT_PUBLIC_DATA_SOURCE;
  if (src === 'firestore' || src === 'firebase') return isFirebaseConfigured;
  return false;
}

// Firestore Timestamp 등 직렬화 불가능한 값을 페이지가 기대하는 형태(ISO 문자열)로 정규화한다.
// 페이지는 startAt/endAt/donatedAt 등을 string 으로 소비하므로 Timestamp → ISO 로 변환한다.
function serialize<T>(data: DocumentData): T {
  const out: DocumentData = {};
  for (const [k, v] of Object.entries(data)) {
    if (v instanceof Timestamp) {
      out[k] = v.toDate().toISOString();
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = serialize(v as DocumentData);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

async function fbDocs<T>(path: string, constraints: any[] = []): Promise<T[] | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const q = constraints.length
      ? query(collection(db, path), ...constraints)
      : query(collection(db, path));
    const snap = await getDocs(q);
    return snap.docs.map((d) => serialize<T>(d.data()));
  } catch {
    return null;
  }
}

async function fbDoc<T>(path: string, id: string): Promise<T | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, path, id));
    return snap.exists() ? serialize<T>(snap.data()) : null;
  } catch {
    return null;
  }
}

// ---- Seasons ----

export async function getSeasons(): Promise<Season[]> {
  if (useFirestore()) {
    const r = await fbDocs<Season>('seasons');
    if (r) return r;
  }
  return mockSeasons;
}

export async function getActiveSeason(): Promise<Season | null> {
  if (useFirestore()) {
    const r = await fbDocs<Season>('seasons', [where('status', '==', 'active')]);
    if (r && r.length) return r[0];
  }
  return mockSeasons.find((s) => s.status === 'active') ?? null;
}

export async function getSeason(seasonId: string): Promise<Season | null> {
  if (useFirestore()) {
    const r = await fbDoc<Season>('seasons', seasonId);
    if (r) return r;
  }
  return mockSeasons.find((s) => s.seasonId === seasonId) ?? null;
}

// ---- Projects ----

export async function getProjects(): Promise<DonationProject[]> {
  if (useFirestore()) {
    const r = await fbDocs<DonationProject>('donationProjects');
    if (r) return r;
  }
  return mockProjects;
}

export async function getProjectsBySeason(
  seasonId: string,
): Promise<DonationProject[]> {
  if (useFirestore()) {
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
  if (useFirestore()) {
    const r = await fbDoc<DonationProject>('donationProjects', projectId);
    if (r) return r;
  }
  return mockProjects.find((p) => p.projectId === projectId) ?? null;
}

// ---- Sponsor campaigns / special stages ----

export async function getSponsorCampaigns(): Promise<SponsorCampaign[]> {
  if (useFirestore()) {
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
  if (useFirestore()) {
    const r = await fbDocs<SpecialStage>('specialStages');
    if (r) return r;
  }
  return mockSpecialStages;
}

// ---- Leaderboard ----

export async function getSeasonLeaderboard(
  seasonId: string,
): Promise<LeaderboardEntry[]> {
  if (useFirestore()) {
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
  if (useFirestore()) {
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
  if (useFirestore()) {
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
  if (useFirestore()) {
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
