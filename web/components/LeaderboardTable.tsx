import type { LeaderboardEntry, DonationProject } from '@/lib/types';
import { formatPoints } from '@/lib/format';

// 공개 리더보드: 닉네임만 노출. 개인정보(이메일/실명/uid 등) 노출 금지.
export default function LeaderboardTable({
  entries,
  projects,
}: {
  entries: LeaderboardEntry[];
  projects: DonationProject[];
}) {
  const projectTitle = (id: string) =>
    projects.find((p) => p.projectId === id)?.title ?? '-';

  if (!entries.length) {
    return <p className="muted">아직 리더보드 데이터가 없습니다.</p>;
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th style={{ width: 64 }}>순위</th>
          <th>닉네임</th>
          <th>응원 프로젝트</th>
          <th style={{ textAlign: 'right' }}>누적 포인트</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e) => (
          <tr key={e.rank}>
            <td className="rank">{e.rank}</td>
            <td>{e.nickname}</td>
            <td>{projectTitle(e.mainProjectId)}</td>
            <td style={{ textAlign: 'right' }}>{formatPoints(e.totalPoints)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
