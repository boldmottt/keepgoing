# 킵고잉 Unity 클라이언트 세팅 가이드 (MVP 1단계)

이 문서는 `unity-client/Assets/Scripts` 의 C# 코드를 실제 Unity 프로젝트에 연결하는
방법을 설명합니다. MVP 1단계는 **서버 없이 오프라인으로 동작하는 로컬 프로토타입**입니다.

## 1. Unity 버전 / 플랫폼

- **Unity 2022 LTS** (예: 2022.3.x) 권장. (`UnityEngine`, `UnityEngine.UI` 사용)
- 빌드 타깃: **Android 우선** (iOS 동일 코드).
- 화면 방향: **세로(Portrait) 고정**.
  - `Project Settings > Player > Resolution and Presentation > Default Orientation = Portrait`
- UI 텍스트는 기본 `UnityEngine.UI.Text` 를 사용합니다.
  TextMeshPro 로 바꾸려면 UI 스크립트의 `Text` 필드를 `TMP_Text` 로 교체하면 됩니다.

## 2. 폴더 구조

```text
Assets/Scripts/
  Core/         GameManager, ScoreManager, InputManager
  Player/       PlayerController, LaneMover
  Obstacles/    ObstacleBase, BillboardObstacle, BannerObstacle, PopupObstacle, ObstacleSpawner
  SpecialStage/ BrandPortal, SpecialStageManager, BrandCollectible
  Donation/     DonationPointCalculator, DonationProjectService
  Firebase/     FirebaseManager, RunApiClient, LeaderboardService (인터페이스 + 로컬 목)
  UI/           HomeUI, ResultUI, ProjectListUI, LeaderboardUI, ProfileUI
```

모든 스크립트는 `KeepGoing.*` 네임스페이스를 사용합니다.

## 3. 씬 구성 (Splash / Home / Game)

MVP1 은 단일 씬에서 상태(GameState)로 화면을 전환해도 되고,
세 개 씬으로 나눠도 됩니다. 가장 간단한 단일 씬 구성을 권장합니다.

### 3.1 단일 씬(권장) — `Game.unity`

1. 빈 GameObject `GameManager` 생성 후 `GameManager.cs` 부착.
2. `InputManager` GameObject 에 `InputManager.cs` 부착 → GameManager 의 `input` 필드에 연결.
3. 플레이어 GameObject:
   - `LaneMover.cs` + `PlayerController.cs` 부착 (LaneMover 가 RequireComponent).
   - `BoxCollider` (IsTrigger 권장은 장애물/수집물 쪽) + `Rigidbody`(Is Kinematic) 부착.
   - GameManager 의 `player` 필드에 연결.
4. `ObstacleSpawner` GameObject 에 `ObstacleSpawner.cs` 부착:
   - billboard/banner/popup/brandPortal 프리팹 연결.
   - GameManager 의 `spawner` 필드에 연결.
5. `SpecialStageManager` GameObject 에 `SpecialStageManager.cs` 부착:
   - coin/billboard/heart/golden 수집물 프리팹 연결.
   - GameManager 의 `specialStage` 필드에 연결.
6. Canvas (Screen Space - Overlay, Reference Resolution 1080x1920 권장):
   - `HomeUI`, `ResultUI`, `ProjectListUI`, `LeaderboardUI`, `ProfileUI` 부착.
   - 각 UI 의 패널/버튼/텍스트 필드를 인스펙터에서 연결.
   - 화면별 패널은 상태에 따라 켜고 끔(HomeUI/ResultUI 가 OnStateChanged 구독).

### 3.2 분리 씬 구성(선택)

- `Splash.unity` → 로고 표시 후 `GameManager.GoHome()` 호출 (또는 `Home.unity` 로드).
- `Home.unity` → HomeUI. 시작 버튼이 `GameManager.StartRun()` 호출.
- `Game.unity` → 플레이/특별 스테이지/결과.
- 씬 전환을 쓸 경우 `GameManager` 에 `DontDestroyOnLoad` 를 추가하거나
  각 씬에 매니저를 두고 상태만 공유하도록 조정하세요.

## 4. 프리팹 만들기

### 장애물 (가짜/패러디 광고 — 실제 브랜드 아님)

| 프리팹 | 부착 스크립트 | 회피 방법 |
|---|---|---|
| Billboard | `BillboardObstacle` | 레인 변경 |
| Banner | `BannerObstacle` | 점프 |
| Popup | `PopupObstacle` | 슬라이드 |

각 프리팹에 `Collider`(IsTrigger=true) 를 두면 플레이어 트리거와 충돌 판정이 됩니다.

### 특별 스테이지 수집물 (긍정적 수집물 — 사망 없음)

| 프리팹 | itemType | 점수 |
|---|---|---|
| Coin | Coin | 20 |
| BigBillboard | Billboard | 100 |
| Heart | Heart | 150 |
| Golden | Golden | 500 |

모두 `BrandCollectible.cs` 부착 + Trigger Collider.

### 브랜드 포털

`BrandPortal.cs` 부착 + Trigger Collider. `stageId` 기본값 `stage-green-energy`.

## 5. 점수/기부 공식 (SPEC §2 그대로)

```text
gameScore = distanceMeters*1 + obstaclesDodged*10 + comboBonus + nearMissBonus + specialStageScore
comboBonus: 10콤보=100, 20콤보=250, 30콤보=500 (구간 누적)
specialStageScore = normalBrandItems*20 + bigBrandItems*100 + heartItems*150 + goldenItems*500 + collectionComboBonus
donationPoints = floor(gameScore * 0.1)
```

`ScoreManager.cs` 가 이 공식을 그대로 구현합니다.

## 6. 서버 연결 (MVP2 — 실제 Firebase 백엔드)

게임 코드는 `IRunApiClient` / `ILeaderboardService` 인터페이스에만 의존하므로
**목(mock) ↔ 실제 Firebase 구현을 토글 하나로 교체**할 수 있습니다.

### 6.1 백엔드 토글

- `GameManager` 인스펙터의 **`Use Firebase Backend`** 체크박스로 선택합니다.
  - **해제(기본값):** 로컬 목 구현으로 오프라인/에디터에서 그대로 동작.
  - **체크:** 실제 Firebase callable(`startRun`/`finishRun`/`get*Leaderboard`/`getActiveSeason`)에 연결.
- 코드상으로는 `new FirebaseManager(useFirebaseBackend)` 가 구현을 선택하고,
  `await firebase.InitializeAsync()` 가 의존성 확인 + 익명 로그인을 수행합니다.

### 6.2 Firebase Unity SDK 임포트 (Auth + Functions)

실제 구현(`FirebaseRunApiClient`, `FirebaseLeaderboardService`, `FirebaseManager` 의 초기화/
익명 로그인 코드)은 **Firebase Unity SDK 가 임포트된 경우에만 컴파일**되도록
`KEEPGOING_FIREBASE` 심볼로 감싸져 있습니다. 다음 순서로 활성화합니다.

1. [Firebase Unity SDK](https://firebase.google.com/download/unity) 를 내려받습니다.
2. 다음 `.unitypackage` 두 개를 Unity 에 임포트합니다(나머지는 불필요):
   - `FirebaseAuth.unitypackage` (익명 인증)
   - `FirebaseFunctions.unitypackage` (callable 함수)
   - 의존성으로 `FirebaseApp`(core)이 함께 들어옵니다.
3. **`google-services.json`**(Android) / **`GoogleService-Info.plist`**(iOS)를
   Firebase 콘솔에서 받아 `Assets/` 아래에 둡니다(Firebase 에디터 확장이 자동 인식).
4. Firebase 콘솔 > Authentication 에서 **익명(Anonymous) 로그인 공급자**를 활성화합니다.
5. **Player Settings > Other Settings > Scripting Define Symbols** 에
   **`KEEPGOING_FIREBASE`** 를 추가합니다(Android/iOS 양쪽).
   - 심볼이 없으면 `useFirebaseBackend` 가 true 여도 안전하게 목으로 폴백합니다.

### 6.3 리전

- 백엔드 callable 은 **`asia-northeast3`** 리전에 배포됩니다.
- 클라이언트는 `FirebaseFunctions.GetInstance("asia-northeast3")` 로 같은 리전을 호출합니다.

### 6.4 동작 흐름

1. `GameManager.Start()` 가 `FirebaseManager.InitializeAsync()` 호출
   → `FirebaseApp.CheckAndFixDependenciesAsync()` → `SignInAnonymouslyAsync()`.
2. `DonationProjectService.LoadFromActiveSeasonAsync(true)` 가 `getActiveSeason()` 으로
   시즌 프로젝트 목록을 받아옵니다(실패 시 로컬 더미 폴백).
3. 런 시작/종료 시 `startRun`/`finishRun` callable 이 호출됩니다.

> 참고: Unity 컴파일은 이 환경에서 검증할 수 없어 수동 리뷰로만 확인했습니다.
> SDK 임포트 후 실제 Unity 에디터에서 컴파일/동작 확인이 필요합니다.

## 7. 금지 사항 (절대 원칙)

- 광고 SDK / 리워드·전면·배너·영상 광고 금지.
- 인앱 결제 / 광고 제거 상품 금지.
- 현금 리워드 / 인출 / 환전 / "1P=1원" 표현 금지.
- 일반 스테이지의 광고판은 모두 가짜/패러디이며, 실제 브랜드는 특별 스테이지의
  긍정적 수집물로만 등장합니다(사망·구매 유도·외부 링크 없음).
