# functions

Firebase Cloud Functions (TypeScript). 게임 기록 검증, 기부 포인트 원장, 리더보드 집계,
시즌/프로젝트/리포트 관리 API.

상세 구현은 `feature/firebase-backend` 브랜치에서 진행합니다.

## 모듈 구조 (예정)

```text
src/
  index.ts        함수 export 진입점
  auth.ts         setNickname, setDefaultDonationProject
  seasons.ts      getActiveSeason
  runs.ts         startRun, finishRun
  donations.ts    포인트 원장 / 배분
  leaderboards.ts 리더보드 집계
  admin.ts        관리자 CRUD + 시즌 배분 계산
  validation.ts   점수 검증 규칙
```
