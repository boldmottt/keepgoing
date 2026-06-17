# 킵고잉 MVP 완성 상태 (Definition of Done §23)

기준일 코드 상태 기준. ✅ = 코드 완료, ⏳ = 사람/환경 작업 필요(코드로 끝낼 수 없음).

## Definition of Done 체크리스트

| 항목 | 상태 | 비고 |
|---|---|---|
| Android 빌드 가능 | ⏳ | Unity 에디터에서 SDK 임포트 후 빌드 필요(이 환경에서 컴파일 불가) |
| 일반 광고 SDK 없음 | ✅ | AdMob/UnityAds/AppLovin 미연동 |
| 인앱 결제 없음 | ✅ | |
| 현금 리워드/출금 없음 | ✅ | |
| 게임 플레이만으로 기부 포인트 | ✅ | `donationPoints = floor(gameScore*0.1)` |
| 유저가 기부 프로젝트 선택 | ✅ | Unity ResultUI + DonationProjectService |
| 기부 리더보드 | ✅ | 시즌/프로젝트/오늘의 리더보드 callable |
| 특별 광고 스테이지 ≥ 1 | ✅ | "초록 에너지 스테이지"(forest) |
| Firebase에 기록/포인트 저장 | ✅ | startRun/finishRun + donationPointLedger |
| 공개 홈페이지 기부 현황 | ✅ | Next.js `/`, `/donations`, `/projects/*`, `/reports/*`, `/leaderboard` |
| 관리자: 시즌/프로젝트/리포트 관리 | ✅ | admin callable + 웹 admin 폼 + 검수 패널 |

## 컴포넌트별 코드 완료 현황

### functions (Firebase Cloud Functions) ✅
- 인증/프로필: setNickname, setDefaultDonationProject, getUserProfile, getMyRuns
- 시즌: getActiveSeason
- 런: startRun, finishRun(순수 결정 로직 `decideFinishRun` + 트랜잭션)
- 리더보드: getSeasonLeaderboard, getProjectLeaderboard, getDailyLeaderboard
- 관리자: 시즌/프로젝트/캠페인/스테이지/리포트 CRUD, closeSeasonAndDistribute
- 검수(§17): listSuspiciousUsers, listRejectedRuns, setUserStatus, reviewRun
- 시드: seedFirestore
- 테스트: Jest **61 케이스**(validation/profile/daily/runLogic/review), CI에서 build+test

### web (공개 + 관리자) ✅
- 공개 7개 라우트, 관리자 대시보드(시즌/프로젝트/캠페인/스테이지/리포트/검수)
- 데이터 레이어: Firestore 읽기 + mock 폴백(`NEXT_PUBLIC_DATA_SOURCE`)
- admin 폼 ↔ callable 시그니처 정렬, 검수 패널 실연동
- `next build` 정적 익스포트 통과

### unity-client ✅(코드) / ⏳(빌드)
- 3레인 러너, 스와이프 입력, 장애물 3종, 점수/콤보, 특별 스테이지, 결과 화면
- Firebase 연동 레이어(Anonymous Auth + callable) — `KEEPGOING_FIREBASE` 심볼/토글, mock 폴백
- ⏳ Unity 에디터에서 Firebase SDK 임포트 + `google-services.json` + 실제 컴파일/디바이스 테스트 필요

### firebase / 배포 ✅(스크립트) / ⏳(실행)
- Firestore 규칙/인덱스, Storage 규칙, 시드 데이터
- `scripts/deploy.sh`, `scripts/set-admin-claim.js`, `.firebaserc`, `docs/DEPLOY.md`
- ⏳ 실제 Firebase 프로젝트 생성 + `bash scripts/deploy.sh` 실행은 사람이 수행

## 출시까지 남은 사람 작업 (코드 외)
1. Firebase 프로젝트 생성 + Auth(Anonymous)/Firestore/Functions/Storage/Hosting 활성화
2. `.firebaserc` 프로젝트 id 교체(`firebase use`), web `.env.local` 채우기
3. `bash scripts/deploy.sh` → `seedFirestore` 호출 → `set-admin-claim.js` 로 관리자 지정
4. Unity: Firebase SDK 임포트, `google-services.json`, `KEEPGOING_FIREBASE` 심볼 켜고 APK 빌드

자세한 절차: [`docs/DEPLOY.md`](DEPLOY.md)
