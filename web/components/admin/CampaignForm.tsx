'use client';

import { useState } from 'react';
import AdminFormShell from './AdminFormShell';
import { saveSponsorCampaign } from '@/lib/functions';

// 후원 캠페인 생성/수정
export default function CampaignForm() {
  const [f, setF] = useState({
    campaignId: '',
    seasonId: '',
    sponsorName: '',
    brandName: '',
    title: '',
    description: '',
    linkedProjectIds: '',
    donationPoolAmount: '',
    startAt: '',
    endAt: '',
    status: 'draft',
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });

  return (
    <>
      <h2>후원 캠페인 생성 / 수정</h2>
      <AdminFormShell
        submit={() =>
          saveSponsorCampaign({
            campaignId: f.campaignId.trim() || undefined,
            seasonId: f.seasonId,
            sponsorName: f.sponsorName,
            brandName: f.brandName,
            title: f.title,
            description: f.description,
            linkedProjectIds: f.linkedProjectIds
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
            donationPoolAmount: Number(f.donationPoolAmount) || 0,
            startAt: f.startAt || undefined,
            endAt: f.endAt || undefined,
            status: f.status,
          })
        }
        successMessage={(res) =>
          `캠페인 저장 완료 (id: ${(res.data as { campaignId?: string })?.campaignId ?? f.campaignId}).`
        }
      >
        <div className="grid grid-2">
          <div className="form-row">
            <label>캠페인 ID (수정 시)</label>
            <input className="input" value={f.campaignId} onChange={set('campaignId')} />
          </div>
          <div className="form-row">
            <label>시즌 ID</label>
            <input className="input" value={f.seasonId} onChange={set('seasonId')} required />
          </div>
        </div>
        <div className="grid grid-2">
          <div className="form-row">
            <label>후원사명</label>
            <input className="input" value={f.sponsorName} onChange={set('sponsorName')} />
          </div>
          <div className="form-row">
            <label>브랜드명 (가상)</label>
            <input className="input" value={f.brandName} onChange={set('brandName')} />
          </div>
        </div>
        <div className="form-row">
          <label>캠페인 제목</label>
          <input className="input" value={f.title} onChange={set('title')} required />
        </div>
        <div className="form-row">
          <label>설명</label>
          <textarea className="textarea" value={f.description} onChange={set('description')} />
        </div>
        <div className="form-row">
          <label>연결 프로젝트 ID (쉼표 구분)</label>
          <input className="input" value={f.linkedProjectIds} onChange={set('linkedProjectIds')} placeholder="project-forest, project-animals" />
        </div>
        <div className="grid grid-2">
          <div className="form-row">
            <label>후원 기부금 풀 (원)</label>
            <input className="input" type="number" value={f.donationPoolAmount} onChange={set('donationPoolAmount')} />
          </div>
          <div className="form-row">
            <label>상태</label>
            <select className="select" value={f.status} onChange={set('status')}>
              <option value="draft">준비 중(draft)</option>
              <option value="active">진행 중(active)</option>
              <option value="ended">종료(ended)</option>
            </select>
          </div>
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
      </AdminFormShell>
    </>
  );
}
