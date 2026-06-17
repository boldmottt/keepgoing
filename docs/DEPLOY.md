# 배포 가이드 (KeepGoing)

킵고잉 / KeepGoing 을 실제 Firebase 프로젝트에 배포하는 end-to-end 가이드입니다.
백엔드(Cloud Functions), Firestore 규칙/인덱스, Storage 규칙, 공개/관리자 웹(Hosting),
그리고 Unity 클라이언트 연동까지 다룹니다.

대상 구조(모노레포):

```text
keepgoing/
  firebase.json     # Firebase 설정 (functions / firestore / storage / hosting / emulators)
  .firebaserc       # 배포 대상 프로젝트 id (템플릿: keepgoing-REPLACE_ME)
  functions/        # Cloud Functions (TypeScript, nodejs22, 리전 asia-northeast3)
  web/              # Next.js 공개/관리자 웹 (정적 export → web/out)
  firebase/         # Firestore 규칙/인덱스, Storage 규칙, 시드 데이터
  scripts/          # 배포/운영 보조 스크립트
  unity-client/     # Unity 게임 클라이언트
```

> 절대 원칙: 광고 SDK / 리워드·전면·배너·영상 광고 / 인앱 결제 / 현금 인출·환전 /
> "1P=1원" 표현은 금지입니다. 배포 구성에도 해당 요소를 추가하지 않습니다.

---

## 0. 사전 준비물

```bash
node -v          # Node 22 권장 (functions 의 engines.node = 22 와 일치)
npm install -g firebase-tools
firebase login
```

- Firebase(=Google Cloud) 계정과, 결제 가능한 프로젝트(Functions 배포는 Blaze 요금제 필요).
- 익명 인증 기반이라 광고/결제 SDK 는 필요 없습니다.

---

## 1. Firebase 프로젝트 생성 + 서비스 활성화

1. [Firebase 콘솔](https://console.firebase.google.com/) 에서 새 프로젝트를 만듭니다.
2. **요금제**: Cloud Functions 배포를 위해 **Blaze(종량제)** 로 업그레이드합니다.
3. 다음 서비스를 활성화합니다.
   - **Authentication > 로그인 방법**:
     - **익명(Anonymous)** 공급자 활성화 (게임 클라이언트가 익명 로그인 사용).
     - **관리자 로그인용** 공급자(예: 이메일/비밀번호 또는 Google) 활성화
       — 관리자 클레임은 이메일 기반 계정에 부여합니다(7단계 참고).
   - **Firestore Database**: 프로덕션 모드로 생성. 리전은 함수와 가까운
     `asia-northeast3`(서울) 권장. (규칙/인덱스는 이 저장소에서 함께 배포됩니다.)
   - **Functions**: 사용 설정(Blaze 필요). 코드 리전은 `asia-northeast3` 로 고정되어 있습니다
     (`functions/src/index.ts` 의 `setGlobalOptions`).
   - **Storage**: 기본 버킷 생성(증빙/이미지 공개 파일 업로드용).
   - **Hosting**: 사용 설정(공개/관리자 웹 정적 배포 대상).

---

## 2. 배포 대상 프로젝트 지정 (`.firebaserc` / `firebase use`)

저장소 루트의 `.firebaserc` 는 플레이스홀더로 들어 있습니다.

```json
{
  "projects": {
    "default": "keepgoing-REPLACE_ME"
  }
}
```

다음 중 한 가지 방법으로 실제 프로젝트 id 로 바꿉니다.

```bash
# 방법 A: .firebaserc 의 keepgoing-REPLACE_ME 를 실제 프로젝트 id 로 직접 수정

# 방법 B: CLI 로 설정 (.firebaserc 가 자동 갱신됨)
firebase use --add        # 목록에서 프로젝트 선택 후 alias=default 지정
firebase use <project-id> # 이미 추가했다면 활성 프로젝트만 전환
```

확인:

```bash
firebase projects:list
firebase use   # 현재 활성 프로젝트 출력
```

---

## 3. 웹 환경변수(`web/.env.local`) 채우기

Firebase 콘솔 > 프로젝트 설정 > 일반 > "내 앱" 에서 **웹 앱**을 추가하고
SDK 설정값(apiKey 등)을 확인합니다.

```bash
cd web
cp .env.example .env.local
```

`web/.env.local` 을 다음과 같이 채웁니다.

```dotenv
NEXT_PUBLIC_FIREBASE_API_KEY=<콘솔의 apiKey>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<project-id>.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<project-id>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<project-id>.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<콘솔의 messagingSenderId>
NEXT_PUBLIC_FIREBASE_APP_ID=<콘솔의 appId>

# 라이브 Firestore 에서 데이터를 읽으려면 firestore 로 지정.
NEXT_PUBLIC_DATA_SOURCE=firestore
```

- `NEXT_PUBLIC_DATA_SOURCE=firestore` 이고 위 `NEXT_PUBLIC_*` 가 모두 채워져야 라이브로 읽습니다.
  (`firebase` 는 `firestore` 의 하위 호환 별칭입니다.)
- 값이 비어 있거나 `mock` 이면 `web/lib/mockData.ts` 더미 데이터로 동작합니다(정적 빌드는 항상 성공).
- 웹은 `next.config.js` 의 `output: 'export'` 로 정적 파일(`web/out`)을 생성하며,
  `firebase.json` 의 `hosting.public = web/out` 으로 배포됩니다.

---

## 4. 배포 실행 (`scripts/deploy.sh`)

저장소 루트에서 실행합니다. functions 빌드 → web 빌드 → `firebase deploy` 를 순서대로 수행합니다.

```bash
bash scripts/deploy.sh
```

수행 내용:

1. `cd functions && npm ci && npm run build` (TypeScript → `functions/lib`)
2. `cd web && npm ci && npm run build` (Next.js 정적 export → `web/out`)
3. `firebase deploy --only functions,firestore:rules,firestore:indexes,storage,hosting`

개별 배포가 필요하면 다음처럼 분리할 수 있습니다.

```bash
firebase deploy --only firestore:rules,firestore:indexes
firebase deploy --only storage
firebase deploy --only functions
firebase deploy --only hosting
```

---

## 5. 더미(시드) 데이터 주입 — `seedFirestore` 호출

시즌/기부 프로젝트/후원 캠페인/특별 스테이지 더미 데이터는 `firebase/seed/seed-data.json`
(함수에 번들된 사본)을 사용하는 **`seedFirestore` callable** 로 주입합니다.

> `seedFirestore` 는 **관리자(admin claim) 전용**입니다. 따라서 보통 6/7단계에서
> 관리자 계정을 먼저 만든 뒤 그 계정으로 호출합니다. 또는 아래 functions:shell 방식을 사용합니다.

### 방법 A: 관리자 계정으로 웹/클라이언트에서 호출

관리자 클레임을 부여한 계정(7단계)으로 로그인한 상태에서 callable 을 호출합니다.
리전은 `asia-northeast3` 입니다.

```js
// Firebase Web SDK 예시 (관리자로 로그인된 상태)
import { getFunctions, httpsCallable } from 'firebase/functions';
const fns = getFunctions(app, 'asia-northeast3');
await httpsCallable(fns, 'seedFirestore')({}); // 기본 번들 시드 사용
// 커스텀 시드: httpsCallable(fns, 'seedFirestore')({ data: <seedJson> })
```

### 방법 B: functions:shell (로컬에서 빠르게)

```bash
cd functions
npm run shell          # = npm run build && firebase functions:shell

# 셸 프롬프트에서 (admin 컨텍스트로 호출):
seedFirestore({}, { auth: { uid: 'seed-admin', token: { admin: true } } })
```

성공 시 `{ ok: true, counts: { seasons, projects, campaigns, stages } }` 를 반환합니다.

---

## 6~7. 관리자 지정 — `scripts/set-admin-claim.js`

관리자 페이지(`/admin`), 관리자 callable(`createSeason` 등), `seedFirestore`,
Storage 업로드는 모두 `admin` 커스텀 클레임을 요구합니다.

1. **서비스 계정 키 발급**: Firebase 콘솔 > 프로젝트 설정 > 서비스 계정 >
   "새 비공개 키 생성" 으로 JSON 키를 내려받습니다. **이 파일은 절대 커밋하지 않습니다.**
2. **의존성 설치** (둘 중 하나):

   ```bash
   npm --prefix scripts install   # scripts/package.json 의 firebase-admin 설치
   # 또는
   npm install -g firebase-admin
   ```

3. **클레임 부여 / 해제**:

   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/serviceAccount.json

   node scripts/set-admin-claim.js admin@example.com           # 부여
   node scripts/set-admin-claim.js admin@example.com --remove  # 해제
   ```

   - 대상 사용자는 이메일 기반 계정이어야 합니다(익명 계정은 이메일이 없어 조회 불가).
   - 클레임 반영을 위해 대상 사용자는 재로그인하거나 클라이언트에서 `getIdToken(true)`
     로 토큰을 갱신해야 합니다.

> 순서 팁: (7) 관리자 계정 클레임 부여 → 그 계정으로 (5) `seedFirestore` 호출.

---

## 8. Unity 클라이언트 연동

게임 클라이언트는 익명 로그인 + callable(`startRun` / `finishRun` /
`get*Leaderboard` / `getActiveSeason`)로 백엔드에 연결합니다. 실제 Firebase 연동 코드는
`KEEPGOING_FIREBASE` 심볼이 정의된 경우에만 컴파일됩니다.

1. [Firebase Unity SDK](https://firebase.google.com/download/unity) 를 내려받아
   **`FirebaseAuth.unitypackage`** + **`FirebaseFunctions.unitypackage`** 를 임포트합니다
   (의존성으로 `FirebaseApp`(core) 포함).
2. Firebase 콘솔에서 **`google-services.json`**(Android) /
   **`GoogleService-Info.plist`**(iOS) 를 받아 `Assets/` 아래에 둡니다.
3. Authentication 에서 **익명(Anonymous) 로그인**을 활성화합니다(1단계와 동일).
4. **Player Settings > Other Settings > Scripting Define Symbols** 에
   **`KEEPGOING_FIREBASE`** 를 추가합니다(Android/iOS 양쪽).
   - 심볼이 없으면 `useFirebaseBackend` 가 true 여도 안전하게 로컬 목으로 폴백합니다.
5. `GameManager` 인스펙터의 **`Use Firebase Backend`** 체크박스로 실제 백엔드를 켭니다.
6. 클라이언트는 `FirebaseFunctions.GetInstance("asia-northeast3")` 로 동일 리전을 호출합니다.

자세한 내용은 [`unity-client/SETUP.md`](../unity-client/SETUP.md) 6장을 참고하세요.

---

## 9. 배포 후 점검

- 공개 웹: Hosting URL(`https://<project-id>.web.app`)에서 시즌/프로젝트/리더보드/리포트 페이지 확인.
- 관리자 웹: `/admin` 에서 관리자 계정 로그인 → 시즌/프로젝트 CRUD 동작 확인.
- 데이터: Firestore 콘솔에서 `seasons` / `donationProjects` 등 시드 문서 확인.
- 보안 규칙: 공개 컬렉션은 읽기 허용, 클라이언트 직접 쓰기는 차단(쓰기는 Functions 경유).

---

## 부록: 로컬 에뮬레이터

라이브 배포 전 로컬에서 검증하려면 에뮬레이터를 사용합니다(`firebase.json` 에 포트 정의).

```bash
cd functions && npm run build
firebase emulators:start    # auth/functions/firestore/hosting/storage + UI
```
