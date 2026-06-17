using System;
using UnityEngine;
using KeepGoing.Player;
using KeepGoing.Obstacles;
using KeepGoing.SpecialStage;
using KeepGoing.Donation;
using KeepGoing.Firebase;

namespace KeepGoing.Core
{
    /// <summary>게임 전체 상태.</summary>
    public enum GameState
    {
        Splash,        // 시작 로고/로딩
        Home,          // 홈 화면
        Playing,       // 일반 스테이지 플레이 중
        SpecialStage,  // 특별(브랜드) 스테이지 진행 중
        GameOver       // 결과 화면
    }

    /// <summary>
    /// 게임의 상태 머신 + 시스템 묶음.
    /// - 시간에 따라 달리기 속도가 증가한다.
    /// - ScoreManager / Spawner / SpecialStageManager / Firebase 클라이언트를 연결한다.
    /// - 서버 없이도(오프라인) 동작하도록 Firebase 는 로컬 목(mock) 구현을 기본으로 쓴다.
    /// </summary>
    public class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        [Header("플레이 속도")]
        [Tooltip("시작 속도 (m/s)")]
        public float baseSpeed = 8f;
        [Tooltip("초당 속도 증가량 (m/s per second)")]
        public float speedIncreasePerSec = 0.15f;
        [Tooltip("최대 속도 (SPEC §6 maxAllowedSpeed=30 미만으로 유지)")]
        public float maxSpeed = 28f;

        [Header("특별 스테이지")]
        [Tooltip("이 거리(m)마다 브랜드 포털이 등장할 수 있다")]
        public float brandPortalEveryMeters = 500f;

        [Header("참조 (인스펙터 연결 또는 자동 탐색)")]
        public PlayerController player;
        public ObstacleSpawner spawner;
        public SpecialStageManager specialStage;
        public InputManager input;

        // ---- 런타임 상태 ----
        public GameState State { get; private set; } = GameState.Splash;
        public float CurrentSpeed { get; private set; }
        public ScoreManager Score { get; private set; }

        private float _playTime;            // 일반 스테이지 누적 플레이 시간(초)
        private float _runStartedAt;        // Time.time 기준 런 시작 시각
        private float _nextPortalAtMeters;  // 다음 포털 등장 거리

        // ---- Firebase / 도네이션 (인터페이스로 추상화) ----
        public IRunApiClient RunApi { get; private set; }
        public ILeaderboardService Leaderboard { get; private set; }
        public DonationProjectService Projects { get; private set; }

        /// <summary>상태 변경 시 UI 등이 구독.</summary>
        public event Action<GameState> OnStateChanged;

        private string _currentRunId;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;

            Score = new ScoreManager();
            Projects = new DonationProjectService();

            // MVP1: 로컬 목 구현. MVP2 에서 FirebaseRunApiClient 등으로 교체만 하면 된다.
            var firebase = new FirebaseManager(useMock: true);
            RunApi = firebase.RunApi;
            Leaderboard = firebase.Leaderboard;
        }

        private void Start()
        {
            if (input != null)
                input.OnSwipe += HandleSwipe;
            SetState(GameState.Splash);
        }

        private void OnDestroy()
        {
            if (input != null)
                input.OnSwipe -= HandleSwipe;
        }

        private void Update()
        {
            switch (State)
            {
                case GameState.Playing:
                    TickPlaying(Time.deltaTime);
                    break;
                case GameState.SpecialStage:
                    // 특별 스테이지의 진행/타이머는 SpecialStageManager 가 담당.
                    break;
            }
        }

        /// <summary>일반 스테이지 매 프레임 갱신.</summary>
        private void TickPlaying(float dt)
        {
            _playTime += dt;

            // 시간에 따라 속도 증가(상한 적용).
            CurrentSpeed = Mathf.Min(baseSpeed + speedIncreasePerSec * _playTime, maxSpeed);

            // 거리 누적.
            float advanced = CurrentSpeed * dt;
            Score.AddDistance(advanced);

            // 스포너에 현재 속도 전달(난이도 스케일).
            if (spawner != null)
                spawner.Tick(dt, CurrentSpeed, advanced);

            // 일정 거리마다 브랜드 포털 등장 트리거.
            if (Score.DistanceMeters >= _nextPortalAtMeters)
            {
                _nextPortalAtMeters += brandPortalEveryMeters;
                if (spawner != null)
                    spawner.RequestBrandPortal();
            }
        }

        // ---------- 상태 전환 ----------

        public void SetState(GameState next)
        {
            State = next;
            OnStateChanged?.Invoke(next);
        }

        public void GoHome()
        {
            SetState(GameState.Home);
        }

        /// <summary>홈에서 게임 시작.</summary>
        public async void StartRun()
        {
            Score.Reset();
            _playTime = 0f;
            CurrentSpeed = baseSpeed;
            _runStartedAt = Time.time;
            _nextPortalAtMeters = brandPortalEveryMeters;

            if (spawner != null) spawner.ResetSpawner();
            if (player != null) player.ResetPlayer();

            // 서버(또는 목)에 런 시작 알림. 오프라인이면 목이 즉시 응답.
            try
            {
                var resp = await RunApi.StartRunAsync(new StartRunRequest { clientVersion = Application.version });
                _currentRunId = resp.runId;
            }
            catch (Exception e)
            {
                Debug.LogWarning($"[GameManager] StartRun 실패(오프라인 모드로 진행): {e.Message}");
                _currentRunId = Guid.NewGuid().ToString();
            }

            SetState(GameState.Playing);
        }

        /// <summary>브랜드 포털에 진입했을 때 특별 스테이지로 전환.</summary>
        public void EnterSpecialStage(string stageId)
        {
            if (State != GameState.Playing) return;
            SetState(GameState.SpecialStage);
            if (specialStage != null)
                specialStage.Begin(stageId, OnSpecialStageFinished);
        }

        /// <summary>특별 스테이지 종료 콜백 → 일반 스테이지 복귀.</summary>
        private void OnSpecialStageFinished()
        {
            if (State == GameState.SpecialStage)
                SetState(GameState.Playing);
        }

        /// <summary>플레이어 사망(장애물 충돌). 특별 스테이지에서는 호출되지 않는다.</summary>
        public async void GameOver()
        {
            if (State == GameState.GameOver) return;
            SetState(GameState.GameOver);

            float durationSec = Mathf.Max(0.001f, Time.time - _runStartedAt);
            int gameScore = Score.GameScore;
            int donationPoints = DonationPointCalculator.Calculate(gameScore);

            var req = new FinishRunRequest
            {
                runId = _currentRunId,
                distanceMeters = Mathf.FloorToInt(Score.DistanceMeters),
                durationSec = Mathf.FloorToInt(durationSec),
                gameScore = gameScore,
                donationPoints = donationPoints,
                normalStageScore = Score.NormalStageScore,
                specialStageScore = Score.SpecialStageScore,
                obstaclesDodged = Score.ObstaclesDodged,
                maxCombo = Score.MaxCombo,
                specialStageEntered = (Score.NormalBrandItems + Score.BigBrandItems +
                                       Score.HeartItems + Score.GoldenItems) > 0,
                selectedProjectId = Projects.SelectedProjectId,
                clientVersion = Application.version
            };

            try
            {
                await RunApi.FinishRunAsync(req);
            }
            catch (Exception e)
            {
                Debug.LogWarning($"[GameManager] FinishRun 실패(오프라인 모드): {e.Message}");
            }
        }

        // ---------- 입력 라우팅 ----------

        private void HandleSwipe(SwipeDirection dir)
        {
            if (player == null) return;
            if (State != GameState.Playing && State != GameState.SpecialStage) return;

            switch (dir)
            {
                case SwipeDirection.Left: player.MoveLeft(); break;
                case SwipeDirection.Right: player.MoveRight(); break;
                case SwipeDirection.Up: player.Jump(); break;
                case SwipeDirection.Down: player.Slide(); break;
            }
        }
    }
}
