'use client';

import { useState } from 'react';
import { callFunction, ADMIN_FUNCTIONS } from '@/lib/functions';

// 의심 유저 / rejected run 검수.
// 실제 목록은 백엔드 조회 함수 연동 필요. 여기서는 더미 행 + 검수 액션 UI 를 제공한다.
interface SuspectRun {
  runId: string;
  uid: string;
  nickname: string;
  gameScore: number;
  donationPoints: number;
  reason: string;
  validationStatus: 'pending' | 'rejected';
}

const MOCK_SUSPECTS: SuspectRun[] = [
  {
    runId: 'run-9f2a',
    uid: 'uid-aaa',
    nickname: '의심러너',
    gameScore: 980000,
    donationPoints: 98000,
    reason: 'invalid_score (속도 초과)',
    validationStatus: 'rejected',
  },
  {
    runId: 'run-3c1b',
    uid: 'uid-bbb',
    nickname: '점프봇',
    gameScore: 540000,
    donationPoints: 54000,
    reason: 'fraudScore 높음',
    validationStatus: 'pending',
  },
];

export default function ReviewPanel() {
  const [rows, setRows] = useState<SuspectRun[]>(MOCK_SUSPECTS);
  const [msg, setMsg] = useState<string | null>(null);

  async function review(runId: string, action: 'confirm' | 'reject' | 'ban') {
    setMsg(null);
    const res = await callFunction(ADMIN_FUNCTIONS.reviewRun, { runId, action });
    setMsg(
      res.mocked
        ? `미연동 환경: ${runId} → ${action} 호출을 흉내냈습니다.`
        : res.ok
          ? `${runId} → ${action} 처리됨.`
          : `오류: ${res.error}`,
    );
    if (res.ok && action !== 'ban') {
      setRows((r) => r.filter((x) => x.runId !== runId));
    }
  }

  return (
    <>
      <h2>의심 유저 / rejected run 검수</h2>
      <p className="todo-note">
        TODO(firebase-backend): 검수 목록 조회 + <code>{ADMIN_FUNCTIONS.reviewRun}</code>{' '}
        callable 연동 필요. 아래는 UI 예시 데이터입니다.
      </p>
      {msg ? (
        <p className="badge" style={{ display: 'block', marginBottom: 12 }}>
          {msg}
        </p>
      ) : null}
      {rows.length ? (
        <table className="table">
          <thead>
            <tr>
              <th>runId</th>
              <th>닉네임</th>
              <th style={{ textAlign: 'right' }}>점수 / 포인트</th>
              <th>사유</th>
              <th>상태</th>
              <th>검수</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.runId}>
                <td>{r.runId}</td>
                <td>{r.nickname}</td>
                <td style={{ textAlign: 'right' }}>
                  {r.gameScore.toLocaleString()} / {r.donationPoints.toLocaleString()}P
                </td>
                <td>{r.reason}</td>
                <td>
                  <span className={r.validationStatus === 'rejected' ? 'badge danger' : 'badge gray'}>
                    {r.validationStatus}
                  </span>
                </td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button className="btn" style={{ padding: '4px 10px' }} onClick={() => review(r.runId, 'confirm')}>
                    승인
                  </button>
                  <button className="btn secondary" style={{ padding: '4px 10px' }} onClick={() => review(r.runId, 'reject')}>
                    반려
                  </button>
                  <button className="btn danger" style={{ padding: '4px 10px' }} onClick={() => review(r.runId, 'ban')}>
                    차단
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted">검수 대기 항목이 없습니다.</p>
      )}
    </>
  );
}
