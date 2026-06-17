'use client';

import { useState } from 'react';
import AdminFormShell from './AdminFormShell';
import {
  saveSeason,
  closeSeasonAndDistribute,
  type CloseSeasonResult,
} from '@/lib/functions';

// 시즌 생성/수정 + 시즌 종료 배분 계산
export default function SeasonForm() {
  const [f, setF] = useState({
    seasonId: '',
    title: '',
    description: '',
    startAt: '',
    endAt: '',
    status: 'draft',
    donationPoolAmount: '',
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });

  // 시즌 종료 배분 상태
  const [closeId, setCloseId] = useState('');
  const [closing, setClosing] = useState(false);
  const [closeMsg, setCloseMsg] = useState<
    null | { type: 'ok' | 'err'; msg: string; result?: CloseSeasonResult }
  >(null);

  async function onClose() {
    if (!closeId.trim()) {
      setCloseMsg({ type: 'err', msg: '시즌 ID 를 입력하세요.' });
      return;
    }
    setClosing(true);
    setCloseMsg(null);
    const res = await closeSeasonAndDistribute(closeId.trim());
    if (res.ok) {
      const total = res.data?.totalEstimated ?? 0;
      setCloseMsg({
        type: 'ok',
        msg: res.mocked
          ? `데모 모드: ${closeId} 종료/배분 계산을 흉내냈습니다.`
          : `${closeId} 종료 완료. 예상 배분 합계 ${total.toLocaleString()}원.`,
        result: res.data,
      });
    } else {
      setCloseMsg({ type: 'err', msg: res.error ?? '종료 처리에 실패했습니다.' });
    }
    setClosing(false);
  }

  return (
    <>
      <h2>시즌 생성 / 수정</h2>
      <AdminFormShell
        submit={() =>
          saveSeason({
            seasonId: f.seasonId.trim() || undefined,
            title: f.title,
            description: f.description,
            startAt: f.startAt || undefined,
            endAt: f.endAt || undefined,
            status: f.status,
            donationPoolAmount: Number(f.donationPoolAmount) || 0,
          })
        }
        successMessage={(res) =>
          `시즌 저장 완료 (id: ${(res.data as { seasonId?: string })?.seasonId ?? f.seasonId}).`
        }
      >
        <div className="form-row">
          <label>시즌 ID (기존 수정 시)</label>
          <input className="input" value={f.seasonId} onChange={set('seasonId')} placeholder="beta-season-2" />
        </div>
        <div className="form-row">
          <label>제목</label>
          <input className="input" value={f.title} onChange={set('title')} required />
        </div>
        <div className="form-row">
          <label>설명</label>
          <textarea className="textarea" value={f.description} onChange={set('description')} />
        </div>
        <div className="grid grid-2">
          <div className="form-row">
            <label>시작일시</label>
            <input className="input" type="datetime-local" value={f.startAt} onChange={set('startAt')} />
          </div>
          <div className="form-row">
            <label>종료일시</label>
            <input className="input" type="datetime-local" value={f.endAt} onChange={set('endAt')} />
          </div>
        </div>
        <div className="grid grid-2">
          <div className="form-row">
            <label>상태</label>
            <select className="select" value={f.status} onChange={set('status')}>
              <option value="draft">준비 중(draft)</option>
              <option value="active">진행 중(active)</option>
              <option value="closed">종료(closed)</option>
              <option value="donated">기부 완료(donated)</option>
            </select>
          </div>
          <div className="form-row">
            <label>시즌 기부금 풀 (원)</label>
            <input className="input" type="number" value={f.donationPoolAmount} onChange={set('donationPoolAmount')} />
          </div>
        </div>
      </AdminFormShell>

      <h2 style={{ marginTop: 28 }}>시즌 종료 / 배분 계산</h2>
      <div className="card">
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
          시즌을 종료(closed)하고 프로젝트별 예상 기부액을 확정 포인트 비율로 계산합니다. 되돌릴 수 없으니 주의하세요.
        </p>
        <div className="form-row">
          <label>종료할 시즌 ID</label>
          <input
            className="input"
            value={closeId}
            onChange={(e) => setCloseId(e.target.value)}
            placeholder="beta-season-1"
          />
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
          <button className="btn danger" type="button" disabled={closing} onClick={onClose}>
            {closing ? '처리 중…' : '시즌 종료 및 배분'}
          </button>
          {closeMsg ? (
            <span
              className={closeMsg.type === 'ok' ? 'badge' : 'badge danger'}
              style={{ whiteSpace: 'normal' }}
            >
              {closeMsg.msg}
            </span>
          ) : null}
        </div>
        {closeMsg?.result?.distribution?.length ? (
          <table className="table" style={{ marginTop: 14 }}>
            <thead>
              <tr>
                <th>프로젝트</th>
                <th style={{ textAlign: 'right' }}>확정 포인트</th>
                <th style={{ textAlign: 'right' }}>예상 기부액(원)</th>
              </tr>
            </thead>
            <tbody>
              {closeMsg.result.distribution.map((d) => (
                <tr key={d.projectId}>
                  <td>{d.projectId}</td>
                  <td style={{ textAlign: 'right' }}>{d.confirmedPoints.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>{d.estimatedDonationAmount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </>
  );
}
