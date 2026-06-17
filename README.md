# 킵고잉 / KeepGoing

> 광고를 보지 않아도 되는 광고 게임.
> 유저는 달리고, 피하고, 모으고, 점수를 얻는다.
> 그 점수는 실제 기부 프로젝트의 결과를 바꾼다.

모바일 캐주얼 3레인 무한 러너 게임입니다. 유저는 광고 영상을 보지 않고, 현질도 없으며,
게임 플레이만으로 얻은 점수를 **기부 포인트**로 전환해 원하는 기부 프로젝트에 배정합니다.
시즌 종료 후 회사/후원사가 제공한 실제 기부금이 프로젝트별 포인트 비율에 따라 배분되고,
실제 기부 내역은 공개 홈페이지에서 투명하게 공개됩니다.

## 절대 원칙 (금지 기능)

- ❌ 일반 광고 SDK (AdMob, Unity Ads, AppLovin 등) 연동 금지
- ❌ 리워드/전면/배너/영상 광고 금지
- ❌ 인앱 결제, 광고 제거 상품 금지
- ❌ 캐시 리워드, 현금 인출, 계좌 정보 수집 금지
- ❌ 포인트를 현금처럼 표현(`1P = 1원`) 금지

## 모노레포 구조

```text
keepgoing/
  unity-client/   # Unity 모바일 게임 클라이언트 (C#)
  web/            # Next.js 공개 기부 홈페이지 + 관리자 페이지
  functions/      # Firebase Cloud Functions (TypeScript)
  firebase/       # Firestore 규칙/인덱스, 시드 데이터
  docs/           # 개발 명세 문서
```

## 기능별 브랜치 / PR 구성

| 브랜치 | 범위 |
|---|---|
| `claude/busy-bell-fo6aob` | 모노레포 뼈대, 폴더 구조, 공유 스펙/더미 데이터 (base) |
| `feature/firebase-backend` | Firestore 구조, Cloud Functions, 점수 검증, 시드 |
| `feature/unity-client` | 3레인 러너, 입력, 장애물, 점수/콤보, 특별 스테이지 |
| `feature/web-frontend` | 공개 기부 홈페이지 + 관리자 페이지 MVP |

> 앞으로의 브랜치 분리·네이밍·머지 순서·CI 규칙은 [`docs/BRANCHING.md`](docs/BRANCHING.md)를 따릅니다.
> 핵심: **리뷰 가능한 동작 단위로 잘게 · 공유 계약은 먼저·따로 · 브랜치는 짧게.**

## 점수 / 기부 포인트 공식

```text
gameScore = distanceMeters * 1 + obstaclesDodged * 10 + comboBonus + nearMissBonus + specialStageScore
donationPoints = floor(gameScore * 0.1)
```

> 기부 포인트는 현금이 아니며, 유저에게 지급되거나 인출되지 않습니다.
> 기부 포인트는 회사 또는 후원사가 제공하는 시즌 기부금의 프로젝트별 배분 기준으로 사용됩니다.
> 실제 기부 내역은 시즌 종료 후 킵고잉 공식 홈페이지에 공개됩니다.

자세한 명세는 [`docs/SPEC.md`](docs/SPEC.md)를 참고하세요.

## 배포

실제 Firebase 프로젝트로 배포하는 방법(프로젝트 생성·서비스 활성화, `.firebaserc`/환경변수 설정,
`scripts/deploy.sh` 실행, 시드 데이터 주입, 관리자 지정, Unity 연동)은
[`docs/DEPLOY.md`](docs/DEPLOY.md)를 참고하세요.

```bash
firebase use <project-id>     # .firebaserc 의 keepgoing-REPLACE_ME 대체
bash scripts/deploy.sh        # functions/web 빌드 후 firebase deploy
```
