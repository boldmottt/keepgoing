import Link from 'next/link';
import type { DonationProject, Season } from '@/lib/types';
import { formatCurrency, formatPoints, formatNumber } from '@/lib/format';

// 시즌 완료 여부에 따라 "예상 기부액" / "실제 기부액" 라벨을 구분한다 (SPEC §8/§16).
function donationLabel(season?: Season | null): string {
  return season && season.status === 'donated' ? '실제 기부액' : '예상 기부액';
}

export default function ProjectCard({
  project,
  season,
}: {
  project: DonationProject;
  season?: Season | null;
}) {
  const pct =
    project.targetAmount > 0
      ? Math.min(100, (project.estimatedDonationAmount / project.targetAmount) * 100)
      : 0;

  return (
    <div className="card">
      <h3>
        <Link href={`/projects/${project.projectId}`}>{project.title}</Link>
      </h3>
      <p className="muted" style={{ margin: '0 0 10px' }}>
        {project.organizationName}
      </p>
      <p style={{ margin: '0 0 14px' }}>{project.description}</p>

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
          {donationLabel(season)}{' '}
          <strong>{formatCurrency(project.estimatedDonationAmount)}</strong>
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 12,
          marginTop: 12,
          fontSize: 13,
          color: 'var(--muted)',
        }}
      >
        <span>누적 {formatPoints(project.confirmedPoints)}</span>
        <span>참여 {formatNumber(project.participantCount)}명</span>
      </div>
    </div>
  );
}
