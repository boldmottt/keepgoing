import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getReports,
  getReport,
  getSeason,
  getProject,
} from '@/lib/data';
import { formatCurrency, formatDate } from '@/lib/format';

export async function generateStaticParams() {
  const reports = await getReports();
  return reports.map((r) => ({ reportId: r.reportId }));
}

export default async function ReportDetailPage({
  params,
}: {
  params: { reportId: string };
}) {
  const report = await getReport(params.reportId);
  if (!report) notFound();

  const [season, project] = await Promise.all([
    getSeason(report.seasonId),
    getProject(report.projectId),
  ]);

  // 시즌 완료 시 "실제 기부액", 미완료 시 "예상 기부액"으로 구분 표기.
  const donated = season?.status === 'donated';
  const amountLabel = donated ? '실제 기부액' : '예상 기부액';

  return (
    <>
      <p className="page-sub" style={{ marginTop: 20 }}>
        <Link href="/reports">← 기부 내역</Link>
      </p>
      <h1 className="page-title">실제 기부 내역</h1>
      <p className="page-sub">
        {report.organizationName}
        {project ? ` · ${project.title}` : ''}
      </p>

      <section className="section">
        <div className="card">
          <dl className="kv">
            <dt>기부일</dt>
            <dd>{formatDate(report.donatedAt)}</dd>
            <dt>단체명</dt>
            <dd>{report.organizationName}</dd>
            <dt>시즌</dt>
            <dd>
              {season ? (
                <Link href={`/seasons/${season.seasonId}`}>{season.title}</Link>
              ) : (
                report.seasonId
              )}
            </dd>
            <dt>프로젝트</dt>
            <dd>
              {project ? (
                <Link href={`/projects/${project.projectId}`}>{project.title}</Link>
              ) : (
                report.projectId
              )}
            </dd>
            <dt>{amountLabel}</dt>
            <dd>
              <strong>{formatCurrency(report.finalDonationAmount)}</strong>
              {!donated ? (
                <span className="badge gray" style={{ marginLeft: 8 }}>
                  시즌 미완료 · 예상치
                </span>
              ) : (
                <span className="badge gold" style={{ marginLeft: 8 }}>
                  기부 완료
                </span>
              )}
            </dd>
          </dl>
        </div>
      </section>

      <section className="section">
        <h2>증빙 자료</h2>
        <div className="card">
          {report.proofFileUrl || report.receiptFileUrl ? (
            <ul style={{ margin: 0 }}>
              {report.proofFileUrl ? (
                <li>
                  <a href={report.proofFileUrl} target="_blank" rel="noreferrer">
                    증빙 이미지/PDF 보기
                  </a>
                </li>
              ) : null}
              {report.receiptFileUrl ? (
                <li>
                  <a href={report.receiptFileUrl} target="_blank" rel="noreferrer">
                    증빙 문서 보기
                  </a>
                </li>
              ) : null}
            </ul>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              증빙 파일은 준비 중입니다.
            </p>
          )}
        </div>
      </section>

      {report.publicMemo ? (
        <section className="section">
          <h2>운영 메모</h2>
          <div className="card">
            <p style={{ margin: 0 }}>{report.publicMemo}</p>
          </div>
        </section>
      ) : null}
    </>
  );
}
