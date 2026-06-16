# functions

킵고잉 / KeepGoing - Firebase Cloud Functions (TypeScript, nodejs22).
firebase-functions v2 callable(onCall) + firebase-admin 기반.
게임 기록 검증, 기부 포인트 원장, 리더보드 집계, 시즌/프로젝트/리포트 관리 API.

## 모듈 구조

```text
src/
  index.ts        함수 export 진입점 (전역 리전: asia-northeast3)
  common.ts       admin 초기화, requireAuth / requireAdmin 헬퍼
  types.ts        Firestore 컬렉션 TS 인터페이스 (SPEC §4)
  validation.ts   점수 검증 규칙 (SPEC §6)
  seasons.ts      getActiveSeason
  auth.ts         setNickname, setDefaultDonationProject
  runs.ts         startRun, finishRun (10단계 트랜잭션 플로우)
  leaderboards.ts getSeasonLeaderboard, getProjectLeaderboard
  admin.ts        시즌/프로젝트/캠페인/스테이지/리포트 CRUD + closeSeasonAndDistribute
  seed.ts         seedFirestore (seed-data.json 으로 시드)
```

## 스크립트

```bash
npm install      # 의존성 설치 (node_modules 는 gitignore)
npm run build    # tsc 컴파일 (lib/ 출력)
npm run lint     # eslint
npm run serve    # 에뮬레이터 실행
npm run deploy   # 배포
```

## 검증 규칙 (SPEC §6)

- durationSec > 0, distanceMeters >= 0, gameScore >= 0
- donationPoints === floor(gameScore * 0.1)
- distanceMeters <= durationSec * 30 (maxAllowedSpeed)
- gameScore <= durationSec * 30 * 5 + 5000 (reasonableMaxScoreByDuration)
- donationPoints <= 100000 (dailyDonationPointCap)

검증 실패 시 run 은 validationStatus="rejected", rejectReason="invalid_score" 로 저장되고
포인트 집계/리더보드 갱신은 수행하지 않습니다. 같은 runId 중복 제출은 거부됩니다.
