# 킵고잉 개발 명세 (요약 / 단일 진실 공급원)

이 문서는 각 기능 브랜치가 공유하는 핵심 계약(데이터 구조, API, 공식, 검증 규칙)을 정의합니다.

## 1. 핵심 컨셉

- 광고를 "보는 것"이 아니라 게임 안에서 "플레이하는 요소"로 만든다.
- 일반 스테이지의 광고판은 가짜/패러디 광고이며 피해야 하는 장애물이다.
- 실제(가상) 브랜드는 특별 광고 스테이지에서만 긍정적 수집 오브젝트로 사용한다.
- 유저 점수 → 기부 포인트 → 시즌 기부금 배분 기준. 유저가 직접 돈을 내지 않는다.

## 2. 점수 / 기부 포인트 공식

```text
gameScore =
  distanceMeters * 1
  + obstaclesDodged * 10
  + comboBonus
  + nearMissBonus
  + specialStageScore

comboBonus:   10콤보=100, 20콤보=250, 30콤보=500 (구간 누적)

specialStageScore =
  normalBrandItems * 20
  + bigBrandItems   * 100
  + heartItems      * 150
  + goldenItems     * 500
  + collectionComboBonus

donationPoints = floor(gameScore * 0.1)
```

기부 포인트는 현금이 아니다. `1P = 1원` 표현 금지.

## 3. 기부금 배분 공식

```text
프로젝트 실제 기부액 =
  시즌 총 기부금 풀 × (프로젝트 확정 포인트 / 시즌 전체 확정 포인트)
```

## 4. Firestore 컬렉션 (필드 요약)

- `users/{uid}`: nickname, avatarId, defaultDonationProjectId, totalDonationPoints,
  seasonDonationPoints, status(active|banned|suspicious), fraudScore, createdAt, lastLoginAt
- `seasons/{seasonId}`: title, description, startAt, endAt,
  status(draft|active|closed|donated), donationPoolAmount, totalConfirmedPoints,
  totalEstimatedDonationAmount
- `donationProjects/{projectId}`: seasonId, title, description, organizationName, imageUrl,
  targetAmount, confirmedPoints, estimatedDonationAmount, participantCount,
  status(active|inactive|completed)
- `runs/{runId}`: uid, seasonId, startedAt, endedAt, durationSec, distanceMeters, gameScore,
  donationPoints, normalStageScore, specialStageScore, obstaclesDodged, maxCombo,
  specialStageEntered, selectedProjectId, validationStatus(pending|confirmed|rejected),
  rejectReason, clientVersion
- `donationPointLedger/{ledgerId}`: uid, runId, seasonId, projectId, points,
  source(normal_run|special_stage|event_bonus|admin_adjustment),
  status(pending|confirmed|rejected), createdAt, confirmedAt
- `leaderboards/{seasonId}/entries/{uid}`: nickname, avatarId, totalPoints, mainProjectId, rank
- `projectLeaderboards/{projectId}/entries/{uid}`: nickname, avatarId, points, rank
- `sponsorCampaigns/{campaignId}`: seasonId, sponsorName, brandName, title, description,
  linkedProjectIds[], donationPoolAmount, startAt, endAt, status(draft|active|ended)
- `specialStages/{stageId}`: campaignId, stageName, theme, durationSec, scoreMultiplier,
  brandName, brandLogoUrl, assetBundleUrl, status(active|inactive)
- `donationReports/{reportId}`: seasonId, projectId, organizationName, finalDonationAmount,
  donatedAt, proofFileUrl, receiptFileUrl, publicMemo, published

## 5. Cloud Functions API (callable)

- `getActiveSeason()` → { season, projects[] }
- `setNickname({ nickname })` — 2~12자, 간단 욕설 필터
- `setDefaultDonationProject({ projectId })` — 프로젝트 존재/active/활성시즌 검증
- `startRun({ clientVersion })` → { runId, serverSeed, startedAt }
- `finishRun({ runId, distanceMeters, durationSec, gameScore, donationPoints,
  normalStageScore, specialStageScore, obstaclesDodged, maxCombo, specialStageEntered,
  selectedProjectId, clientVersion })`
  1. active season 확인 2. user status 확인 3. selectedProject active 확인
  4. 점수 기본 검증 5. runs 저장 6. donationPointLedger 생성 7. 유저 포인트 증가
  8. 프로젝트 포인트 증가 9. 시즌 전체 포인트 증가 10. 리더보드 갱신
- 관리자: 시즌/프로젝트/캠페인/리포트 CRUD + 시즌 종료 배분 계산 (admin claim 필요)

## 6. 점수 검증 규칙 (MVP)

```text
durationSec > 0
distanceMeters >= 0
gameScore >= 0
donationPoints == floor(gameScore * 0.1)
distanceMeters <= durationSec * maxAllowedSpeed   (maxAllowedSpeed = 30 m/s)
gameScore <= reasonableMaxScoreByDuration
donationPoints <= dailyDonationPointCap           (= 100,000P)
```

실패 시 validationStatus="rejected", rejectReason="invalid_score", 집계/리더보드 미반영.
같은 runId 중복 제출 불가. banned 유저 저장 불가. confirmed 포인트만 리더보드 반영.

## 7. 분석 이벤트

app_open, login_success, nickname_set, home_view, run_start, run_end, run_rejected,
special_stage_entered, special_stage_completed, donation_project_selected,
donation_points_allocated, leaderboard_view, project_detail_view, profile_view,
sponsor_stage_impression, sponsor_stage_entered, sponsor_item_collected,
sponsor_stage_completed, sponsor_project_selected

## 8. 문구 가이드

- 사용: 기부 포인트, 포인트 보내기, 프로젝트 응원하기, 예상 기부액, 시즌 기부금 풀
- 금지: 캐시, 현금, 인출, 환전, 1포인트=1원, "당신이 직접 기부했습니다", 기부금 영수증, 돈 벌기

전체 원문 명세는 PR 설명 및 docs 디렉터리에 함께 보관합니다.
