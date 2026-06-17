import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getProjects,
  getProject,
  getSeason,
  getProjectContributors,
  getSponsorCampaignsByProject,
} from '@/lib/data';
import {
  formatCurrency,
  formatPoints,
  formatNumber,
  formatPercent,
} from '@/lib/format';

export async function generateStaticParams() {
  const projects = await getProjects();
  return projects.map((p) => ({ projectId: p.projectId }));
}

export default async function ProjectDetailPage({
  params,
}: {
  params: { projectId: string };
}) {
  const project = await getProject(params.projectId);
  if (!project) notFound();

  const [season, contributors, campaigns] = await Promise.all([
    getSeason(project.seasonId),
    getProjectContributors(project.projectId),
    getSponsorCampaignsByProject(project.projectId),
  ]);

  const donated = season?.status === 'donated';
  const donationLabel = donated ? '실제 기부액' : '예상 기부액';
  const ratio =
    season && season.totalConfirmedPoints > 0
      ? project.confirmedPoints / season.totalConfirmedPoints
      : 0;
  const pct =
    project.targetAmount > 0
      ? Math.min(100, (project.estimatedDonationAmount / project.targetAmount) * 100)
      : 0;

  return (
    <>
      <p className="page-sub" style={{ marginTop: 20 }}>
        {season ? (
          <Link href={`/seasons/${season.seasonId}`}>← {season.title}</Link>
        ) : (
          <Link href="/donations">← 기부 현황</Link>
        )}
      </p>
      <h1 className="page-title">{project.title}</h1>
      <p className="page-sub">
        <strong>{project.organizationName}</strong>
      </p>

      <section className="section">
        <div className="card">
          <p style={{ marginTop: 0 }}>{project.description}</p>
          <div className="progress" aria-hidden>
            <span style={{ width: `${pct}%` }} />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 13,
              marginTop: 6,
            }}
          >
            <span className="muted">목표 {formatCurrency(project.targetAmount)}</span>
            <span>
              {donationLabel}{' '}
              <strong>{formatCurrency(project.estimatedDonationAmount)}</strong>
            </span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="grid grid-4">
          <div className="statbox">
            <div className="value">{formatCurrency(project.targetAmount)}</div>
            <div className="label">목표 금액</div>
          </div>
          <div className="statbox">
            <div className="value">{formatCurrency(project.estimatedDonationAmount)}</div>
            <div className="label">{donationLabel}</div>
          </div>
          <div className="statbox">
            <div className="value">{formatPoints(project.confirmedPoints)}</div>
            <div className="label">누적 확정 포인트 ({formatPercent(ratio)})</div>
          </div>
          <div className="statbox">
            <div className="value">{formatNumber(project.participantCount)}명</div>
            <div className="label">참여 유저 수</div>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>상위 기여자</h2>
        {contributors.length ? (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 64 }}>순위</th>
                <th>닉네임</th>
                <th style={{ textAlign: 'right' }}>기여 포인트</th>
              </tr>
            </thead>
            <tbody>
              {contributors.map((c) => (
                <tr key={c.rank}>
                  <td className="rank">{c.rank}</td>
                  <td>{c.nickname}</td>
                  <td style={{ textAlign: 'right' }}>{formatPoints(c.points)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">아직 기여자 데이터가 없습니다.</p>
        )}
      </section>

      {campaigns.length ? (
        <section className="section">
          <h2>관련 후원 브랜드</h2>
          <div className="grid grid-2">
            {campaigns.map((c) => (
              <div className="card" key={c.campaignId}>
                <h3 style={{ marginTop: 0 }}>
                  {c.title} <span className="badge gold">{c.brandName}</span>
                </h3>
                <p style={{ marginBottom: 0 }}>{c.description}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
