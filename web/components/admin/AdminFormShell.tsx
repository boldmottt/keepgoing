'use client';

import { useState } from 'react';
import type { CallResult } from '@/lib/functions';

// 관리자 폼 공용 래퍼: 제출 핸들러 실행 + 로딩/성공/오류 상태 표시.
// 각 폼은 lib/functions.ts 의 타입드 래퍼를 호출하는 submit 함수를 넘긴다.
export default function AdminFormShell({
  submit,
  successMessage,
  submitLabel = '저장',
  children,
}: {
  submit: () => Promise<CallResult>;
  // 성공 시 표시할 메시지(결과를 받아 동적으로 구성 가능).
  successMessage?: (res: CallResult) => string;
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
    try {
      const res = await submit();
      if (res.ok) {
        const base = successMessage
          ? successMessage(res)
          : '저장되었습니다.';
        setStatus({
          type: 'ok',
          msg: res.mocked
            ? `${base} (데모 모드: 실제 저장 없음)`
            : base,
        });
      } else {
        setStatus({ type: 'err', msg: res.error ?? '호출에 실패했습니다.' });
      }
    } catch (err) {
      setStatus({
        type: 'err',
        msg: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={onSubmit}>
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
