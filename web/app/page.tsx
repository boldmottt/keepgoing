import Link from 'next/link';
import {
  getSiteStats,
  getActiveSeason,
  getProjectsBySeason,
  getReports,
} from '@/lib/data';
import { formatCurrency, formatPoints, formatNumber, formatDate, daysUntil } from '@/lib/format';
import { SITE_NAME, SITE_TAGLINE } from '@/lib/constants';
import StatBox from '@/components/StatBox';
import ProjectCard from '@/components/ProjectCard';
import SeasonBadge from '@/components/SeasonBadge';
import Disclaimer from '@/components/Disclaimer';

export default async function HomePage() {
  const [stats, season, reports] = await Promise.all([
    getSiteStats(),
    getActiveSeason(),
    getReports(),
  ]);
  const projects = season ? await getProjectsBySeason(season.seasonId) : [];
  const recentReports = reports.slice(0, 3);

  return (
    <>
      <section className="hero">
        <h1>{SITE_NAME}</h1>
        <p>{SITE_TAGLINE}.</p>
        <p>달리고, 피하고, 모으고, 점수를 얻으세요.</p>
        <p>그 점수가 실제 기부 프로젝트의 결과를 바꿉니다.</p>
        <p className="hero-actions">
          <Link href="/donations" className="btn">
            💝 기부 현황 보기
          </Link>
          <Link href="/leaderboard" className="btn secondary">
            🏆 리더보드
          </Link>
        </p>
      </section>

      <section className="section">
        <h2>킵고잉 소개</h2>
        <div className="card">
          <p style={{ marginTop: 0 }}>
            킵고잉은 광고 영상을 보지 않아도 되는 캐주얼 러너 게임입니다. 유저는
            현질 없이 게임 플레이만으로 <strong>기부 포인트</strong>를 쌓고, 원하는
            기부 프로젝트에 포인트를 보내 응원할 수 있습니다.
          </p>
          <p style={{ marginBottom: 0 }}>
            시즌이 끝나면 회사·후원사가 마련한 <strong>시즌 기부금 풀</strong>이
            프로젝트별 확정 포인트 비율에 따라 실제로 기부되고, 그 내역은 이
            홈페이지에 투명하게 공개됩니다.
          </p>
        </div>
      </section>

      <section className="section">
        <h2>누적 현황</h2>
        <div className="grid grid-3">
          <StatBox value={formatCurrency(stats.totalDonationAmount)} label="누적 기부금" />
          <StatBox value={formatPoints(stats.totalPoints)} label="누적 기부 포인트" />
          <StatBox value={formatNumber(stats.totalPlays)} label="누적 플레이 수" />
        </div>
      </section>

      {season ? (
        <section className="section">
          <h2>
            진행 중 시즌 <SeasonBadge status={season.status} />
          </h2>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>
              <Link href={`/seasons/${season.seasonId}`}>{season.title}</Link>
            </h3>
            <p>{season.description}</p>
            <div className="kv spaced">
              <dt>시즌 기부금 풀</dt>
              <dd>{formatCurrency(season.donationPoolAmount)}</dd>
              <dt>시즌 종료 예정일</dt>
              <dd>
                {formatDate(season.endAt)} (D-{daysUntil(season.endAt)})
              </dd>
            </div>
          </div>
        </section>
      ) : null}

      {projects.length ? (
        <section className="section">
          <h2>진행 중 프로젝트</h2>
          <div className="grid grid-3">
            {projects.map((p) => (
              <ProjectCard key={p.projectId} project={p} season={season} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="section">
        <h2>최근 실제 기부 내역</h2>
        {recentReports.length ? (
          <div className="grid grid-2">
            {recentReports.map((r) => (
              <div className="card" key={r.reportId}>
                <h3 style={{ marginTop: 0 }}>
                  <Link href={`/reports/${r.reportId}`}>{r.organizationName}</Link>
                </h3>
                <div className="kv">
                  <dt>기부일</dt>
                  <dd>{formatDate(r.donatedAt)}</dd>
                  <dt>실제 기부액</dt>
                  <dd>{formatCurrency(r.finalDonationAmount)}</dd>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">아직 공개된 실제 기부 내역이 없습니다.</p>
        )}
      </section>

      <section className="section">
        <Disclaimer />
      </section>
    </>
  );
}
