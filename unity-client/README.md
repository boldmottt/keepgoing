# unity-client

Unity 모바일 게임 클라이언트 (C#, Android 우선, 세로 Portrait).

상세 구현은 `feature/unity-client` 브랜치에서 진행합니다.

## 폴더 구조 (예정)

```text
Assets/Scripts/
  Core/        GameManager, ScoreManager, InputManager
  Player/      PlayerController, LaneMover
  Obstacles/   ObstacleBase, Billboard/Banner/Popup, ObstacleSpawner
  SpecialStage/SpecialStageManager, BrandCollectible, BrandPortal
  Donation/    DonationPointCalculator, DonationProjectService
  Firebase/    FirebaseManager, RunApiClient, LeaderboardService
  UI/          Home/Result/ProjectList/Leaderboard/Profile UI
```
