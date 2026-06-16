'use client';

import { useState } from 'react';
import SeasonForm from './SeasonForm';
import ProjectForm from './ProjectForm';
import CampaignForm from './CampaignForm';
import SpecialStageForm from './SpecialStageForm';
import ReportForm from './ReportForm';
import ReviewPanel from './ReviewPanel';

type TabKey =
  | 'season'
  | 'project'
  | 'campaign'
  | 'stage'
  | 'report'
  | 'review';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'season', label: '시즌' },
  { key: 'project', label: '프로젝트' },
  { key: 'campaign', label: '후원 캠페인' },
  { key: 'stage', label: '특별 스테이지' },
  { key: 'report', label: '기부 리포트' },
  { key: 'review', label: '검수' },
];

export default function AdminDashboard({
  email,
  demoMode,
  onSignOut,
}: {
  email: string | null;
  demoMode: boolean;
  onSignOut: () => void;
}) {
  const [tab, setTab] = useState<TabKey>('season');

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginTop: 20,
        }}
      >
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>
            관리자
          </h1>
          <p className="page-sub" style={{ margin: 0 }}>
            {email}
            {demoMode ? (
              <span className="badge gold" style={{ marginLeft: 8 }}>
                데모 모드 (Firebase 미설정)
              </span>
            ) : null}
          </p>
        </div>
        <button className="btn secondary" onClick={onSignOut}>
          로그아웃
        </button>
      </div>

      {demoMode ? (
        <p className="todo-note spaced">
          Firebase 환경변수가 설정되지 않아 데모 모드로 동작합니다. 폼 제출은 실제
          저장 없이 callable 호출을 흉내냅니다. 실제 운영 시 NEXT_PUBLIC_FIREBASE_*
          설정과 admin custom claim 이 필요합니다.
        </p>
      ) : null}

      <div className="admin-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? 'active' : ''}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <section className="section" style={{ marginTop: 8 }}>
        {tab === 'season' && <SeasonForm />}
        {tab === 'project' && <ProjectForm />}
        {tab === 'campaign' && <CampaignForm />}
        {tab === 'stage' && <SpecialStageForm />}
        {tab === 'report' && <ReportForm />}
        {tab === 'review' && <ReviewPanel />}
      </section>
    </>
  );
}
