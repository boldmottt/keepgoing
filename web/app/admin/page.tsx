'use client';

import { useEffect, useState } from 'react';
import {
  subscribeAuth,
  adminSignIn,
  adminSignOut,
  type AdminState,
} from '@/lib/adminAuth';
import AdminDashboard from '@/components/admin/AdminDashboard';

export default function AdminPage() {
  const [state, setState] = useState<AdminState>({
    loading: true,
    user: null,
    isAdmin: false,
    demoMode: false,
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsub = subscribeAuth(setState);
    return () => unsub();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await adminSignIn(email, password);
    if (!res.ok) setError(res.error ?? '로그인에 실패했습니다.');
    setSubmitting(false);
  }

  if (state.loading) {
    return (
      <section className="section">
        <p className="muted">불러오는 중…</p>
      </section>
    );
  }

  // 로그인 게이트
  if (!state.user) {
    return (
      <section className="section" style={{ maxWidth: 420 }}>
        <h1 className="page-title">관리자 로그인</h1>
        <p className="page-sub">관리자 권한(admin claim)이 있는 계정만 접근할 수 있습니다.</p>
        <form className="card" onSubmit={onSubmit}>
          <div className="form-row">
            <label htmlFor="email">이메일</label>
            <input
              id="email"
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="password">비밀번호</label>
            <input
              id="password"
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? (
            <p className="badge danger" style={{ display: 'block', marginBottom: 12 }}>
              {error}
            </p>
          ) : null}
          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? '로그인 중…' : '로그인'}
          </button>
        </form>
      </section>
    );
  }

  // 권한 없음
  if (!state.isAdmin) {
    return (
      <section className="section">
        <h1 className="page-title">권한 없음</h1>
        <p className="page-sub">
          이 계정({state.user.email})에는 관리자 권한이 없습니다. 관리자 custom
          claim 이 필요합니다.
        </p>
        <button className="btn secondary" onClick={() => adminSignOut()}>
          로그아웃
        </button>
      </section>
    );
  }

  return (
    <AdminDashboard
      email={state.user.email}
      demoMode={state.demoMode}
      onSignOut={() => adminSignOut()}
    />
  );
}
