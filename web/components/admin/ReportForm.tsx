'use client';

import { useState } from 'react';
import AdminFormShell from './AdminFormShell';
import { saveDonationReport } from '@/lib/functions';

// 기부 리포트 업로드 (증빙 파일 / 공개 여부)
export default function ReportForm() {
  const [f, setF] = useState({
    reportId: '',
    seasonId: '',
    projectId: '',
    organizationName: '',
    finalDonationAmount: '',
    donatedAt: '',
    proofFileUrl: '',
    receiptFileUrl: '',
    publicMemo: '',
    published: false,
  });
  const setText = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value });

  return (
    <>
      <h2>기부 리포트 업로드</h2>
      <AdminFormShell
        submit={() =>
          saveDonationReport({
            reportId: f.reportId.trim() || undefined,
            seasonId: f.seasonId,
            projectId: f.projectId,
            organizationName: f.organizationName,
            finalDonationAmount: Number(f.finalDonationAmount) || 0,
            donatedAt: f.donatedAt || undefined,
            proofFileUrl: f.proofFileUrl,
            receiptFileUrl: f.receiptFileUrl,
            publicMemo: f.publicMemo,
            published: f.published,
          })
        }
        successMessage={(res) =>
          `리포트 저장 완료 (id: ${(res.data as { reportId?: string })?.reportId ?? f.reportId}).`
        }
        submitLabel="리포트 저장"
      >
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
          증빙 이미지/PDF 는 파일 URL 로 입력합니다. 실제 업로드는 Firebase Storage
          업로드 후 URL 을 전달하도록 연동 예정입니다.
        </p>
        <div className="grid grid-2">
          <div className="form-row">
            <label>리포트 ID (수정 시)</label>
            <input className="input" value={f.reportId} onChange={setText('reportId')} />
          </div>
          <div className="form-row">
            <label>시즌 ID</label>
            <input className="input" value={f.seasonId} onChange={setText('seasonId')} required />
          </div>
        </div>
        <div className="grid grid-2">
          <div className="form-row">
            <label>프로젝트 ID</label>
            <input className="input" value={f.projectId} onChange={setText('projectId')} required />
          </div>
          <div className="form-row">
            <label>단체명</label>
            <input className="input" value={f.organizationName} onChange={setText('organizationName')} required />
          </div>
        </div>
        <div className="grid grid-2">
          <div className="form-row">
            <label>실제 기부액 (원)</label>
            <input className="input" type="number" value={f.finalDonationAmount} onChange={setText('finalDonationAmount')} />
          </div>
          <div className="form-row">
            <label>기부일시</label>
            <input className="input" type="datetime-local" value={f.donatedAt} onChange={setText('donatedAt')} />
          </div>
        </div>
        <div className="form-row">
          <label>증빙 이미지/PDF URL</label>
          <input className="input" value={f.proofFileUrl} onChange={setText('proofFileUrl')} />
        </div>
        <div className="form-row">
          <label>증빙 문서 URL</label>
          <input className="input" value={f.receiptFileUrl} onChange={setText('receiptFileUrl')} />
        </div>
        <div className="form-row">
          <label>운영 메모 (공개)</label>
          <textarea className="textarea" value={f.publicMemo} onChange={setText('publicMemo')} />
        </div>
        <div className="form-row">
          <label>
            <input
              type="checkbox"
              checked={f.published}
              onChange={(e) => setF({ ...f, published: e.target.checked })}
            />{' '}
            공개(published)
          </label>
        </div>
      </AdminFormShell>
    </>
  );
}
