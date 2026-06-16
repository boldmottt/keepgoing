import {
  getActiveSeason,
  getSeasons,
  getProjects,
  getSeasonLeaderboard,
} from '@/lib/data';
import LeaderboardTable from '@/components/LeaderboardTable';
import SeasonBadge from '@/components/SeasonBadge';

export const metadata = { title: '리더보드 | 킵고잉' };

export default async function LeaderboardPage() {
  // 활성 시즌 우선, 없으면 가장 첫 시즌.
  const [active, seasons, projects] = await Promise.all([
    getActiveSeason(),
    getSeasons(),
    getProjects(),
  ]);
  const season = active ?? seasons[0] ?? null;
  const entries = season ? await getSeasonLeaderboard(season.seasonId) : [];

  return (
    <>
      <h1 className="page-title">공개 리더보드</h1>
      <p className="page-sub">
        시즌별 상위 플레이어를 닉네임으로만 공개합니다. 개인정보는 표시되지
        않습니다.
      </p>

      {season ? (
        <section className="section">
          <h2>
            {season.title} <SeasonBadge status={season.status} />
          </h2>
          <LeaderboardTable entries={entries} projects={projects} />
        </section>
      ) : (
        <p className="muted">표시할 시즌이 없습니다.</p>
      )}
    </>
  );
}
