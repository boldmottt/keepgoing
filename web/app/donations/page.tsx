import Link from 'next/link';
import { getSeasons, getProjectsBySeason } from '@/lib/data';
import {
  formatCurrency,
  formatPoints,
  formatNumber,
  formatPercent,
  formatDate,
  daysUntil,
} from '@/lib/format';
import SeasonBadge from '@/components/SeasonBadge';
import Disclaimer from '@/components/Disclaimer';
import type { Season } from '@/lib/types';

export const metadata = { title: '기부 현황 | 킵고잉' };

async function SeasonDonationBlock({ season }: { season: Season }) {
  const projects = await getProjectsBySeason(season.seasonId);
  const donated = season.status === 'donated';
  const donationLabel = donated ? '실제 기부액' : '예상 기부액';
  const participantTotal = projects.reduce((s, p) => s + p.participantCount, 0);

  return (
    <div className="section">
      <h2>
        <Link href={`/seasons/${season.seasonId}`}>{season.title}</Link>{' '}
        <SeasonBadge status={season.status} />
      </h2>

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <div className="statbox">
          <div className="value">{formatCurrency(season.donationPoolAmount)}</div>
          <div className="label">시즌 기부금 풀</div>
        </div>
        <div className="statbox">
          <div className="value">{formatPoints(season.totalConfirmedPoints)}</div>
          <div className="label">시즌 전체 확정 포인트</div>
        </div>
        <div className="statbox">
          <div className="value">{formatNumber(participantTotal)}명</div>
          <div className="label">참여 유저 수</div>
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

      <table className="table">
        <thead>
          <tr>
            <th>프로젝트</th>
            <th>단체</th>
            <th style={{ textAlign: 'right' }}>확정 포인트</th>
            <th style={{ textAlign: 'right' }}>포인트 비율</th>
            <th style={{ textAlign: 'right' }}>{donationLabel}</th>
            <th style={{ textAlign: 'right' }}>참여</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => {
            const ratio =
              season.totalConfirmedPoints > 0
                ? p.confirmedPoints / season.totalConfirmedPoints
                : 0;
            return (
              <tr key={p.projectId}>
                <td>
                  <Link href={`/projects/${p.projectId}`}>{p.title}</Link>
                </td>
                <td>{p.organizationName}</td>
                <td style={{ textAlign: 'right' }}>{formatPoints(p.confirmedPoints)}</td>
                <td style={{ textAlign: 'right' }}>{formatPercent(ratio)}</td>
                <td style={{ textAlign: 'right' }}>
                  {formatCurrency(p.estimatedDonationAmount)}
                </td>
                <td style={{ textAlign: 'right' }}>{formatNumber(p.participantCount)}명</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
        {donated
          ? '시즌이 종료되어 실제 기부액으로 표기됩니다.'
          : '시즌 진행 중에는 확정 포인트 비율에 따른 예상 기부액으로 표기됩니다. 최종 금액은 시즌 종료 후 확정됩니다.'}
      </p>
    </div>
  );
}

export default async function DonationsPage() {
  const seasons = await getSeasons();

  return (
    <>
      <h1 className="page-title">기부 현황</h1>
      <p className="page-sub">
        시즌별 시즌 기부금 풀과 프로젝트별 예상/실제 기부액, 포인트 비율, 참여 유저
        수를 확인하세요.
      </p>

      {seasons.map((s) => (
        <SeasonDonationBlock key={s.seasonId} season={s} />
      ))}

      <section className="section">
        <Disclaimer />
      </section>
    </>
  );
}
