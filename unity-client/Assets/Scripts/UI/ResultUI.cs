using UnityEngine;
using UnityEngine.UI;
using KeepGoing.Core;
using KeepGoing.Donation;

namespace KeepGoing.UI
{
    /// <summary>
    /// 결과(게임 오버) 화면 컨트롤러. SPEC §12.4.
    /// 표시 항목: 점수 / 거리 / 회피 장애물 / 특별 스테이지 점수 / 기부 포인트
    /// + 기부 프로젝트 선택 + 면책 문구.
    /// 허용 문구만 사용한다("이 프로젝트에 포인트 보내기").
    /// </summary>
    public class ResultUI : MonoBehaviour
    {
        [Header("루트 패널")]
        public GameObject resultPanel;

        [Header("점수 표시")]
        public Text gameScoreText;
        public Text distanceText;
        public Text obstaclesText;
        public Text specialStageScoreText;
        public Text donationPointsText;
        public Text comboText;

        [Header("기부 프로젝트")]
        public Text selectedProjectText;
        public Button sendPointsButton;     // "이 프로젝트에 포인트 보내기"
        public Button changeProjectButton;  // 프로젝트 변경
        public ProjectListUI projectListUI;

        [Header("기타")]
        public Text disclaimerText;
        public Button homeButton;
        public Button retryButton;

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
            if (homeButton != null) homeButton.onClick.AddListener(() => GameManager.Instance?.GoHome());
            if (retryButton != null) retryButton.onClick.AddListener(() => GameManager.Instance?.StartRun());
            if (changeProjectButton != null) changeProjectButton.onClick.AddListener(() => projectListUI?.Show());
            if (sendPointsButton != null) sendPointsButton.onClick.AddListener(OnSendPoints);

            if (disclaimerText != null)
                disclaimerText.text = DonationPointCalculator.Disclaimer;
        }

        private void HandleState(GameState state)
        {
            bool show = state == GameState.GameOver;
            if (resultPanel != null) resultPanel.SetActive(show);
            if (show) Refresh();
        }

        /// <summary>결과 값으로 화면 갱신.</summary>
        public void Refresh()
        {
            var gm = GameManager.Instance;
            if (gm == null) return;

            var s = gm.Score;
            int gameScore = s.GameScore;
            int donationPoints = DonationPointCalculator.Calculate(gameScore);

            if (gameScoreText != null) gameScoreText.text = $"점수 {gameScore:N0}";
            if (distanceText != null) distanceText.text = $"거리 {Mathf.FloorToInt(s.DistanceMeters):N0}m";
            if (obstaclesText != null) obstaclesText.text = $"회피한 장애물 {s.ObstaclesDodged:N0}개";
            if (specialStageScoreText != null) specialStageScoreText.text = $"특별 스테이지 {s.SpecialStageScore:N0}점";
            if (comboText != null) comboText.text = $"최고 콤보 {s.MaxCombo}";
            if (donationPointsText != null) donationPointsText.text = $"기부 포인트 {donationPoints:N0}P";

            UpdateSelectedProject();
        }

        private void UpdateSelectedProject()
        {
            var gm = GameManager.Instance;
            var p = gm?.Projects.Selected;
            if (selectedProjectText != null)
            {
                selectedProjectText.text = p != null
                    ? $"받는 프로젝트: {p.title}"
                    : "프로젝트를 선택해 주세요";
            }
        }

        private void OnSendPoints()
        {
            // MVP1: 클라이언트는 finishRun 시 selectedProjectId 를 함께 전송한다(GameManager.GameOver).
            // 이 버튼은 선택 확정 + 확인 피드백 용도. 실제 배분은 서버/시즌 종료 시 처리.
            UpdateSelectedProject();
            Debug.Log("[ResultUI] 이 프로젝트에 포인트 보내기 (선택 확정)");
        }
    }
}
