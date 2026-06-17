import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getSeasons,
  getSeason,
  getProjectsBySeason,
  getSponsorCampaigns,
  getReports,
} from '@/lib/data';
import {
  formatCurrency,
  formatPoints,
  formatNumber,
  formatDate,
  daysUntil,
} from '@/lib/format';
import SeasonBadge from '@/components/SeasonBadge';
import ProjectCard from '@/components/ProjectCard';

// 정적 익스포트(output: 'export')를 위한 경로 생성.
export async function generateStaticParams() {
  const seasons = await getSeasons();
  return seasons.map((s) => ({ seasonId: s.seasonId }));
}

export default async function SeasonDetailPage({
  params,
}: {
  params: { seasonId: string };
}) {
  const season = await getSeason(params.seasonId);
  if (!season) notFound();

  const [projects, campaigns, reports] = await Promise.all([
    getProjectsBySeason(season.seasonId),
    getSponsorCampaigns(),
    getReports(),
  ]);
  const seasonCampaigns = campaigns.filter((c) => c.seasonId === season.seasonId);
  const seasonReports = reports.filter((r) => r.seasonId === season.seasonId);
  const donated = season.status === 'donated';

  return (
    <>
      <p className="page-sub" style={{ marginTop: 20 }}>
        <Link href="/donations">← 기부 현황</Link>
      </p>
      <h1 className="page-title">
        {season.title} <SeasonBadge status={season.status} />
      </h1>
      <p className="page-sub">{season.description}</p>

      <section className="section">
        <div className="grid grid-4">
          <div className="statbox">
            <div className="value">{formatCurrency(season.donationPoolAmount)}</div>
            <div className="label">시즌 기부금 풀</div>
          </div>
          <div className="statbox">
            <div className="value">{formatPoints(season.totalConfirmedPoints)}</div>
            <div className="label">시즌 전체 확정 포인트</div>
          </div>
          <div className="statbox">
            <div className="value">{formatDate(season.startAt)}</div>
            <div className="label">시작일</div>
          </div>
          <div className="statbox">
            <div className="value">
              {donated ? '완료' : `D-${daysUntil(season.endAt)}`}
            </div>
            <div className="label">
              {donated ? '기부 완료' : `종료 예정 ${formatDate(season.endAt)}`}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>참여 프로젝트</h2>
        {projects.length ? (
          <div className="grid grid-3">
            {projects.map((p) => (
              <ProjectCard key={p.projectId} project={p} season={season} />
            ))}
          </div>
        ) : (
          <p className="muted">등록된 프로젝트가 없습니다.</p>
        )}
      </section>

      {seasonCampaigns.length ? (
        <section className="section">
          <h2>후원 브랜드 캠페인</h2>
          <div className="grid grid-2">
            {seasonCampaigns.map((c) => (
              <div className="card" key={c.campaignId}>
                <h3 style={{ marginTop: 0 }}>
                  {c.title} <span className="badge gold">{c.brandName}</span>
                </h3>
                <p>{c.description}</p>
                <p className="muted" style={{ fontSize: 13, margin: 0 }}>
                  후원사: {c.sponsorName}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {seasonReports.length ? (
        <section className="section">
          <h2>실제 기부 내역</h2>
          <table className="table">
            <thead>
              <tr>
                <th>단체</th>
                <th>기부일</th>
                <th style={{ textAlign: 'right' }}>실제 기부액</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {seasonReports.map((r) => (
                <tr key={r.reportId}>
                  <td>{r.organizationName}</td>
                  <td>{formatDate(r.donatedAt)}</td>
                  <td style={{ textAlign: 'right' }}>
                    {formatCurrency(r.finalDonationAmount)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Link href={`/reports/${r.reportId}`}>상세</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <p className="muted" style={{ fontSize: 13 }}>
        {donated
          ? '시즌이 종료되어 실제 기부가 완료되었습니다.'
          : `시즌 진행 중입니다. 표기된 금액은 예상 기부액이며, 최종 금액은 시즌 종료 후 확정됩니다. (참여 ${formatNumber(
              projects.reduce((s, p) => s + p.participantCount, 0),
            )}명)`}
      </p>
    </>
  );
}
