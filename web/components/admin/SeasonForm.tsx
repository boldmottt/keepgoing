'use client';

import { useState } from 'react';
import AdminFormShell from './AdminFormShell';
import { ADMIN_FUNCTIONS } from '@/lib/functions';

// 시즌 생성/수정
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

  return (
    <>
      <h2>시즌 생성 / 수정</h2>
      <AdminFormShell
        functionName={ADMIN_FUNCTIONS.upsertSeason}
        buildPayload={() => ({
          ...f,
          donationPoolAmount: Number(f.donationPoolAmount) || 0,
        })}
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
    </>
  );
}
