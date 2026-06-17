using System.Collections.Generic;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.UI;
using KeepGoing.Core;
using KeepGoing.Firebase;

namespace KeepGoing.UI
{
    /// <summary>
    /// 리더보드 화면.
    /// ILeaderboardService(목/Firebase)에서 시즌 랭킹을 받아 표시한다.
    /// </summary>
    public class LeaderboardUI : MonoBehaviour
    {
        [Header("루트 패널")]
        public GameObject panel;

        [Header("리스트")]
        public LeaderboardRowUI rowPrefab;
        public Transform contentParent;

        [Header("버튼")]
        public Button closeButton;

        [Header("탭 (시즌 / 오늘)")]
        public Button seasonTabButton;
        public Button dailyTabButton;

        [Header("설정")]
        public string seasonId = "beta-season-1";

        /// <summary>리더보드 표시 모드.</summary>
        public enum Mode { Season, Daily }

        private readonly List<LeaderboardRowUI> _rows = new List<LeaderboardRowUI>();
        private Mode _mode = Mode.Season;

        private void Start()
        {
            if (closeButton != null) closeButton.onClick.AddListener(Hide);
            if (seasonTabButton != null) seasonTabButton.onClick.AddListener(() => SwitchMode(Mode.Season));
            if (dailyTabButton != null) dailyTabButton.onClick.AddListener(() => SwitchMode(Mode.Daily));
            if (panel != null) panel.SetActive(false);
        }

        public async void Show()
        {
            if (panel != null) panel.SetActive(true);
            await Load();
        }

        /// <summary>탭 전환 시 호출. 모드를 바꾸고 다시 로드한다.</summary>
        private async void SwitchMode(Mode mode)
        {
            _mode = mode;
            await Load();
        }

        private async Task Load()
        {
            var gm = GameManager.Instance;
            if (gm == null || gm.Leaderboard == null) return;

            var entries = _mode == Mode.Daily
                ? await gm.Leaderboard.GetDailyLeaderboardAsync(seasonId, 50)
                : await gm.Leaderboard.GetSeasonLeaderboardAsync(seasonId, 50);
            Render(entries);
        }

        public void Hide()
        {
            if (panel != null) panel.SetActive(false);
        }

        private void Render(List<LeaderboardEntry> entries)
        {
            foreach (var r in _rows)
                if (r != null) Destroy(r.gameObject);
            _rows.Clear();

            if (rowPrefab == null || contentParent == null) return;

            foreach (var e in entries)
            {
                var row = Instantiate(rowPrefab, contentParent);
                row.Bind(e);
                _rows.Add(row);
            }
        }
    }

    /// <summary>리더보드 한 행 컨트롤러.</summary>
    public class LeaderboardRowUI : MonoBehaviour
    {
        public Text rankText;
        public Text nicknameText;
        public Text pointsText;

        public void Bind(LeaderboardEntry e)
        {
            if (rankText != null) rankText.text = $"{e.rank}";
            if (nicknameText != null) nicknameText.text = e.nickname;
            if (pointsText != null) pointsText.text = $"{e.totalPoints:N0}P";
        }
    }
}
