using UnityEngine;
using UnityEngine.UI;
using KeepGoing.Core;

namespace KeepGoing.UI
{
    /// <summary>
    /// 홈 화면 컨트롤러.
    /// - 게임 시작 버튼
    /// - 기부 프로젝트/리더보드/프로필 화면 이동 버튼
    /// - 현재 선택된 기부 프로젝트 요약 표시 (SPEC §8 허용 문구 사용)
    /// </summary>
    public class HomeUI : MonoBehaviour
    {
        [Header("루트 패널")]
        public GameObject homePanel;

        [Header("버튼")]
        public Button startButton;
        public Button projectsButton;
        public Button leaderboardButton;
        public Button profileButton;

        [Header("표시")]
        public Text seasonTitleText;
        public Text selectedProjectText;

        [Header("다른 화면들")]
        public ProjectListUI projectListUI;
        public LeaderboardUI leaderboardUI;
        public ProfileUI profileUI;

        private void OnEnable()
        {
            if (GameManager.Instance != null)
                GameManager.Instance.OnStateChanged += HandleState;
        }

        private void OnDisable()
        {
            if (GameManager.Instance != null)
                GameManager.Instance.OnStateChanged -= HandleState;
        }

        private void Start()
        {
            if (startButton != null) startButton.onClick.AddListener(OnStart);
            if (projectsButton != null) projectsButton.onClick.AddListener(() => projectListUI?.Show());
            if (leaderboardButton != null) leaderboardButton.onClick.AddListener(() => leaderboardUI?.Show());
            if (profileButton != null) profileButton.onClick.AddListener(() => profileUI?.Show());

            Refresh();
        }

        private void HandleState(GameState state)
        {
            if (homePanel != null)
                homePanel.SetActive(state == GameState.Home);
            if (state == GameState.Home)
                Refresh();
        }

        /// <summary>홈 표시 내용 갱신.</summary>
        public void Refresh()
        {
            var gm = GameManager.Instance;
            if (gm == null) return;

            if (seasonTitleText != null)
                seasonTitleText.text = "킵고잉 베타 시즌 1";

            if (selectedProjectText != null)
            {
                var p = gm.Projects.Selected;
                // SPEC §8 허용 문구.
                selectedProjectText.text = p != null
                    ? $"응원 중인 프로젝트: {p.title}"
                    : "응원할 프로젝트를 선택해 주세요";
            }
        }

        private void OnStart()
        {
            GameManager.Instance?.StartRun();
        }
    }
}
