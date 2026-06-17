import Link from 'next/link';
import { getReports, getSeasons } from '@/lib/data';
import { formatCurrency, formatDate } from '@/lib/format';

export const metadata = { title: '기부 내역 | 킵고잉' };

export default async function ReportsPage() {
  const [reports, seasons] = await Promise.all([getReports(), getSeasons()]);
  const seasonTitle = (id: string) =>
    seasons.find((s) => s.seasonId === id)?.title ?? id;

  return (
    <>
      <h1 className="page-title">실제 기부 내역</h1>
      <p className="page-sub">
        시즌 종료 후 회사·후원사가 진행한 실제 기부 내역을 투명하게 공개합니다.
      </p>

      <section className="section">
        {reports.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>기부일</th>
                <th>시즌</th>
                <th>단체</th>
                <th style={{ textAlign: 'right' }}>실제 기부액</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.reportId}>
                  <td>{formatDate(r.donatedAt)}</td>
                  <td>{seasonTitle(r.seasonId)}</td>
                  <td>{r.organizationName}</td>
                  <td style={{ textAlign: 'right' }}>
                    {formatCurrency(r.finalDonationAmount)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Link href={`/reports/${r.reportId}`}>상세 보기</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">아직 공개된 실제 기부 내역이 없습니다.</p>
        )}
      </section>
    </>
  );
}
