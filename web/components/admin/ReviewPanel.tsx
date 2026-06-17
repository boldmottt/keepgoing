'use client';

import { useState } from 'react';

// 의심 유저 / rejected run 검수.
//
// NOTE(backend): 현재 functions/src/admin.ts 에는 검수용 callable
// (예: reviewRun, banUser) 과 의심 목록 조회 함수가 존재하지 않는다.
// 백엔드 계약이 추가되기 전까지 이 패널은 로컬 UI 데모로만 동작한다.
// 백엔드 추가 시 lib/functions.ts 에 타입드 래퍼를 만들어 review() 에서 호출한다.
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

  // NOTE(backend): 검수 callable 이 백엔드에 추가되면 여기서 호출한다.
  // 지금은 백엔드 계약이 없어 로컬 상태만 갱신하는 UI 데모다.
  function review(runId: string, action: 'confirm' | 'reject' | 'ban') {
    setMsg(`(데모) ${runId} → ${action}: 검수 callable 백엔드 연동 대기 중.`);
    if (action !== 'ban') {
      setRows((r) => r.filter((x) => x.runId !== runId));
    }
  }

  return (
    <>
      <h2>의심 유저 / rejected run 검수</h2>
      <p className="todo-note">
        검수 목록 조회/처리 callable 은 아직 백엔드(functions/src/admin.ts)에 없습니다.
        백엔드 계약 추가 후 연동 예정이며, 아래는 UI 예시 데이터입니다.
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
