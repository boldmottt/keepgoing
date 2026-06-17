'use client';

import { useState } from 'react';
import AdminFormShell from './AdminFormShell';
import { ADMIN_FUNCTIONS } from '@/lib/functions';

// 특별 스테이지 설정
export default function SpecialStageForm() {
  const [f, setF] = useState({
    stageId: '',
    campaignId: '',
    stageName: '',
    theme: '',
    durationSec: '15',
    scoreMultiplier: '1',
    brandName: '',
    brandLogoUrl: '',
    assetBundleUrl: '',
    status: 'active',
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });

  return (
    <>
      <h2>특별 스테이지 설정</h2>
      <AdminFormShell
        functionName={ADMIN_FUNCTIONS.upsertSpecialStage}
        buildPayload={() => ({
          ...f,
          durationSec: Number(f.durationSec) || 0,
          scoreMultiplier: Number(f.scoreMultiplier) || 1,
          assetBundleUrl: f.assetBundleUrl || null,
        })}
      >
        <div className="grid grid-2">
          <div className="form-row">
            <label>스테이지 ID (수정 시)</label>
            <input className="input" value={f.stageId} onChange={set('stageId')} />
          </div>
          <div className="form-row">
            <label>캠페인 ID</label>
            <input className="input" value={f.campaignId} onChange={set('campaignId')} required />
          </div>
        </div>
        <div className="form-row">
          <label>스테이지 이름</label>
          <input className="input" value={f.stageName} onChange={set('stageName')} required />
        </div>
        <div className="grid grid-2">
          <div className="form-row">
            <label>테마</label>
            <input className="input" value={f.theme} onChange={set('theme')} placeholder="forest" />
          </div>
          <div className="form-row">
            <label>브랜드명</label>
            <input className="input" value={f.brandName} onChange={set('brandName')} />
          </div>
        </div>
        <div className="grid grid-2">
          <div className="form-row">
            <label>지속 시간(초)</label>
            <input className="input" type="number" value={f.durationSec} onChange={set('durationSec')} />
          </div>
          <div className="form-row">
            <label>점수 배수</label>
            <input className="input" type="number" step="0.1" value={f.scoreMultiplier} onChange={set('scoreMultiplier')} />
          </div>
        </div>
        <div className="grid grid-2">
          <div className="form-row">
            <label>브랜드 로고 URL</label>
            <input className="input" value={f.brandLogoUrl} onChange={set('brandLogoUrl')} />
          </div>
          <div className="form-row">
            <label>에셋 번들 URL</label>
            <input className="input" value={f.assetBundleUrl} onChange={set('assetBundleUrl')} />
          </div>
        </div>
        <div className="form-row">
          <label>상태</label>
          <select className="select" value={f.status} onChange={set('status')}>
            <option value="active">활성(active)</option>
            <option value="inactive">비활성(inactive)</option>
          </select>
        </div>
      </AdminFormShell>
    </>
  );
}
