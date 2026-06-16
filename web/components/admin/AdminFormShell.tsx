'use client';

import { useState } from 'react';
import { callFunction } from '@/lib/functions';

// 관리자 폼 공용 래퍼: callable 함수 호출 + 상태 메시지 표시.
export default function AdminFormShell({
  functionName,
  buildPayload,
  submitLabel = '저장',
  children,
}: {
  functionName: string;
  buildPayload: () => Record<string, unknown>;
  submitLabel?: string;
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<
    null | { type: 'ok' | 'err'; msg: string }
  >(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    const payload = buildPayload();
    const res = await callFunction(functionName, payload);
    if (res.ok) {
      setStatus({
        type: 'ok',
        msg: res.mocked
          ? `미연동 환경: "${functionName}" 호출을 흉내냈습니다 (실제 저장 X).`
          : `"${functionName}" 호출 성공.`,
      });
    } else {
      setStatus({ type: 'err', msg: res.error ?? '호출 실패' });
    }
    setBusy(false);
  }

  return (
    <form className="card" onSubmit={onSubmit}>
      <p className="todo-note">
        TODO(firebase-backend): 이 폼은 callable 함수 <code>{functionName}</code>{' '}
        에 연결됩니다. 백엔드 시그니처 확정 후 입력/검증을 맞추세요.
      </p>
      {children}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
        <button className="btn" type="submit" disabled={busy}>
          {busy ? '처리 중…' : submitLabel}
        </button>
        {status ? (
          <span
            className={status.type === 'ok' ? 'badge' : 'badge danger'}
            style={{ whiteSpace: 'normal' }}
          >
            {status.msg}
          </span>
        ) : null}
      </div>
    </form>
  );
}
