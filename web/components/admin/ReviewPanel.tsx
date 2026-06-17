'use client';

import { useEffect, useState } from 'react';
import {
  listRejectedRuns,
  listSuspiciousUsers,
  reviewRun,
  setUserStatus,
  type RejectedRun,
  type SuspiciousUser,
  type AdminUserStatus,
} from '@/lib/functions';

// 의심 유저 / rejected run 검수 (functions/src/review.ts 연동).
// Firebase 미설정 시 콜이 mock 으로 처리되므로 아래 데모 데이터로 폴백한다.

const MOCK_RUNS: RejectedRun[] = [
  {
    runId: 'run-9f2a',
    uid: 'uid-aaa',
    seasonId: 'beta-season-1',
    gameScore: 980000,
    donationPoints: 98000,
    rejectReason: 'invalid_score',
    selectedProjectId: 'project-forest',
    createdAtMillis: Date.now(),
  },
];

const MOCK_USERS: SuspiciousUser[] = [
  {
    uid: 'uid-bbb',
    nickname: '점프봇',
    status: 'suspicious',
    fraudScore: 82,
    totalDonationPoints: 54000,
    seasonDonationPoints: 54000,
  },
];

export default function ReviewPanel() {
  const [runs, setRuns] = useState<RejectedRun[]>([]);
  const [users, setUsers] = useState<SuspiciousUser[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState(false);

  async function load() {
    setLoading(true);
    const [runRes, userRes] = await Promise.all([
      listRejectedRuns(100),
      listSuspiciousUsers(100),
    ]);
    const isDemo = !!(runRes.mocked || userRes.mocked);
    setDemo(isDemo);
    if (isDemo) {
      setRuns(MOCK_RUNS);
      setUsers(MOCK_USERS);
    } else {
      setRuns(runRes.data?.runs ?? []);
      setUsers(userRes.data?.users ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function onReviewRun(runId: string, action: 'confirm' | 'reject') {
    if (demo) {
      setMsg(`(데모) ${runId} → ${action}`);
      setRuns((r) => r.filter((x) => x.runId !== runId));
      return;
    }
    const res = await reviewRun(runId, action);
    if (res.ok) {
      setMsg(`런 ${runId} ${action === 'confirm' ? '승인(확정)' : '반려(거부)'} 완료`);
      setRuns((r) => r.filter((x) => x.runId !== runId));
    } else {
      setMsg(`오류: ${res.error}`);
    }
  }

  async function onSetUserStatus(uid: string, status: AdminUserStatus) {
    if (demo) {
      setMsg(`(데모) ${uid} → ${status}`);
      return;
    }
    const res = await setUserStatus(uid, status);
    if (res.ok) {
      setMsg(`유저 ${uid} 상태 → ${status}`);
      setUsers((u) => u.map((x) => (x.uid === uid ? { ...x, status } : x)));
    } else {
      setMsg(`오류: ${res.error}`);
    }
  }

  if (loading) return <p className="muted">불러오는 중…</p>;

  return (
    <>
      <h2>유저 / 기록 검수</h2>
      {demo ? (
        <p className="todo-note">
          Firebase 미설정 — 데모 데이터입니다. 설정 후 listRejectedRuns /
          listSuspiciousUsers / reviewRun / setUserStatus callable 과 연동됩니다.
        </p>
      ) : null}
      {msg ? (
        <p className="badge" style={{ display: 'block', marginBottom: 12 }}>
          {msg}
        </p>
      ) : null}

      <h3>거부된 런 (rejected)</h3>
      {runs.length ? (
        <table className="table">
          <thead>
            <tr>
              <th>runId</th>
              <th>uid</th>
              <th style={{ textAlign: 'right' }}>점수 / 포인트</th>
              <th>사유</th>
              <th>검수</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.runId}>
                <td>{r.runId}</td>
                <td>{r.uid}</td>
                <td style={{ textAlign: 'right' }}>
                  {r.gameScore.toLocaleString()} / {r.donationPoints.toLocaleString()}P
                </td>
                <td>
                  <span className="badge danger">{r.rejectReason ?? '-'}</span>
                </td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button className="btn" style={{ padding: '4px 10px' }} onClick={() => onReviewRun(r.runId, 'confirm')}>
                    승인
                  </button>
                  <button className="btn secondary" style={{ padding: '4px 10px' }} onClick={() => onReviewRun(r.runId, 'reject')}>
                    반려 유지
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted">거부된 런이 없습니다.</p>
      )}

      <h3 style={{ marginTop: 24 }}>의심 / 정지 유저</h3>
      {users.length ? (
        <table className="table">
          <thead>
            <tr>
              <th>uid</th>
              <th>닉네임</th>
              <th>상태</th>
              <th style={{ textAlign: 'right' }}>fraudScore</th>
              <th>처리</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.uid}>
                <td>{u.uid}</td>
                <td>{u.nickname || '(없음)'}</td>
                <td>
                  <span className={u.status === 'banned' ? 'badge danger' : 'badge gray'}>
                    {u.status}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>{u.fraudScore}</td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button className="btn danger" style={{ padding: '4px 10px' }} onClick={() => onSetUserStatus(u.uid, 'banned')}>
                    차단
                  </button>
                  <button className="btn secondary" style={{ padding: '4px 10px' }} onClick={() => onSetUserStatus(u.uid, 'suspicious')}>
                    주의
                  </button>
                  <button className="btn" style={{ padding: '4px 10px' }} onClick={() => onSetUserStatus(u.uid, 'active')}>
                    해제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted">의심/정지 유저가 없습니다.</p>
      )}
    </>
  );
}
