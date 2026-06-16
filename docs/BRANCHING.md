# 브랜치 관리 규칙 (KeepGoing)

이 문서는 킵고잉 모노레포의 단일 브랜치 운영 규칙입니다. 모든 기여는 이 규칙을 따릅니다.

## 1. 핵심 원칙 3가지

> **잘게 · 계약 먼저 · 짧게.**

1. **잘게** — 한 브랜치 = 한 PR = "리뷰 가능한 하나의 동작(슬라이스)". 컴포넌트 통째가 아니라 end-to-end 슬라이스로 자른다.
2. **계약 먼저(contract-first)** — 여러 곳이 공유하는 Cloud Functions 시그니처/타입(`docs/SPEC.md`)은 *별도의 작은 PR로 먼저* 머지한 뒤 클라이언트 작업을 시작한다.
3. **짧게** — 브랜치는 짧게 살린다. 며칠 안에 base로 머지하고, 길어지면 더 잘게 쪼갠다.

## 2. 브랜치 모델

```text
claude/busy-bell-fo6aob   ← 통합 base (실질적 main 역할)
  ├─ feat/...             기능 슬라이스
  ├─ fix/...             버그 수정
  ├─ chore/...           설정/빌드/문서
  └─ contract/...        공유 계약(시그니처·타입) 변경 — 최우선 머지
```

- **base 브랜치:** `claude/busy-bell-fo6aob`. (저장소에 `main`이 없고 직접 push가 차단되어 이 브랜치를 통합 기준으로 사용. 추후 정식 `main` 확립 권장.)
- 모든 작업 브랜치는 **최신 base에서 분기**한다.
- base에 직접 push 금지(거버넌스/뼈대 제외). 기능은 반드시 PR 경유.

## 3. 네이밍 규칙

```text
<type>/<area>-<slice>
```

| type | 용도 |
|---|---|
| `feat` | 신규 기능 |
| `fix` | 버그 수정 |
| `chore` | 빌드·설정·의존성·문서 |
| `contract` | 공유 계약(callable 시그니처/공용 타입) 변경 |
| `refactor` | 동작 변화 없는 구조 개선 |

| area | 범위 |
|---|---|
| `fn` | Firebase Functions (`functions/`) |
| `unity` | Unity 클라이언트 (`unity-client/`) |
| `web` | 웹 프론트엔드 (`web/`) |
| `fb` | Firestore 규칙/인덱스/시드 (`firebase/`) |
| `docs` | 문서 (`docs/`) |

**예시**

```text
feat/fn-finishrun-validation
feat/unity-special-stage
feat/web-project-detail
fix/web-leaderboard-rank-off-by-one
contract/fn-finishrun-payload-v2
chore/ci-add-web-build
```

## 4. 브랜치 크기 가이드

- 목표: **변경 ≲ 400~500줄(생성 스캐폴드 제외)**, 리뷰 30분 이내.
- 한 PR이 두 가지 이상의 "동작"을 담으면 분리한다.
- **하나의 PR은 가능하면 하나의 area만** 건드린다. 불가피하게 `contract`로 여러 area가 동시에 깨질 땐 contract PR을 먼저 머지.
- 같은 공유 파일(`package.json`, 공용 타입 등)을 동시에 만지는 브랜치를 **병렬로 띄우지 않는다**(충돌 방지).

## 5. 머지 순서 (의존성 기준)

```text
contract/*  →  feat/fn-*  →  feat/web-* / feat/unity-*
```

클라이언트(웹/Unity)는 백엔드 계약이 머지된 뒤 작업/머지한다.

현재 열린 초기 PR 권장 머지 순서:

```text
#1 feature/firebase-backend  (백엔드 계약 확정)
#3 feature/web-frontend      (계약 소비)
#2 feature/unity-client      (계약 소비)
```

## 6. PR 규칙

- 모든 PR은 **draft로 생성**, 준비되면 ready로 전환.
- base = `claude/busy-bell-fo6aob`.
- 제목 prefix로 area 표기: `[firebase] ...`, `[unity] ...`, `[web] ...`.
- CI(아래)가 green 이어야 머지.
- 머지 방식: **Squash merge** 권장(브랜치당 커밋 1개로 히스토리 정리).
- 머지 후 기능 브랜치는 삭제.
- base 변경으로 충돌이 생기면 작업 브랜치에서 base를 머지/리베이스해 해소.

## 7. CI

`.github/workflows/ci.yml` 가 PR마다 자동 실행된다(경로 변경 시에만 해당 잡 수행).

- **functions:** `npm ci` + `tsc` 빌드 (`functions/` 변경 시)
- **web:** `npm ci` + `next build` (`web/` 변경 시)
- **Unity:** 실제 빌드는 Unity 라이선스/GameCI가 필요해 MVP 단계에선 CI 제외. C# 변경은 PR 수동 리뷰로 검증(추후 GameCI 도입 가능).

각 잡은 해당 디렉터리에 `package.json` 이 있을 때만 동작하므로, 아직 스캐폴드가 없는 브랜치에서도 실패하지 않는다.

## 8. 계약 변경(contract) 절차

1. `docs/SPEC.md` 의 해당 시그니처/타입을 먼저 수정.
2. `contract/...` 브랜치로 작은 PR 생성 → 우선 머지.
3. base를 각 클라이언트 브랜치에 반영 후 클라이언트 코드 수정.

> 한 줄 요약: **"리뷰 가능한 동작 단위로 잘게, 공유 계약은 먼저·따로, 브랜치는 짧게."**
