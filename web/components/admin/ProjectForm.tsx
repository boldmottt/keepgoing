'use client';

import { useState } from 'react';
import AdminFormShell from './AdminFormShell';
import { saveProject } from '@/lib/functions';

// 프로젝트 생성/수정
export default function ProjectForm() {
  const [f, setF] = useState({
    projectId: '',
    seasonId: '',
    title: '',
    description: '',
    organizationName: '',
    imageUrl: '',
    targetAmount: '',
    status: 'active',
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });

  return (
    <>
      <h2>프로젝트 생성 / 수정</h2>
      <AdminFormShell
        submit={() =>
          saveProject({
            projectId: f.projectId.trim() || undefined,
            seasonId: f.seasonId,
            title: f.title,
            description: f.description,
            organizationName: f.organizationName,
            imageUrl: f.imageUrl,
            targetAmount: Number(f.targetAmount) || 0,
            status: f.status,
          })
        }
        successMessage={(res) =>
          `프로젝트 저장 완료 (id: ${(res.data as { projectId?: string })?.projectId ?? f.projectId}).`
        }
      >
        <div className="grid grid-2">
          <div className="form-row">
            <label>프로젝트 ID (수정 시)</label>
            <input className="input" value={f.projectId} onChange={set('projectId')} placeholder="project-xxx" />
          </div>
          <div className="form-row">
            <label>시즌 ID</label>
            <input className="input" value={f.seasonId} onChange={set('seasonId')} placeholder="beta-season-1" required />
          </div>
        </div>
        <div className="form-row">
          <label>제목</label>
          <input className="input" value={f.title} onChange={set('title')} required />
        </div>
        <div className="form-row">
          <label>단체명</label>
          <input className="input" value={f.organizationName} onChange={set('organizationName')} required />
        </div>
        <div className="form-row">
          <label>설명</label>
          <textarea className="textarea" value={f.description} onChange={set('description')} />
        </div>
        <div className="grid grid-2">
          <div className="form-row">
            <label>대표 이미지 URL</label>
            <input className="input" value={f.imageUrl} onChange={set('imageUrl')} />
          </div>
          <div className="form-row">
            <label>목표 금액 (원)</label>
            <input className="input" type="number" value={f.targetAmount} onChange={set('targetAmount')} />
          </div>
        </div>
        <div className="form-row">
          <label>상태</label>
          <select className="select" value={f.status} onChange={set('status')}>
            <option value="active">활성(active)</option>
            <option value="inactive">비활성(inactive)</option>
            <option value="completed">완료(completed)</option>
          </select>
        </div>
      </AdminFormShell>
    </>
  );
}
