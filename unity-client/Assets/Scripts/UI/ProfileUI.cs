using UnityEngine;
using UnityEngine.UI;
using KeepGoing.Core;
using KeepGoing.Donation;

namespace KeepGoing.UI
{
    /// <summary>
    /// 프로필 화면.
    /// - 닉네임 표시/편집(2~12자)
    /// - 기본 응원 프로젝트 표시/변경
    /// - 누적 기부 포인트 표시(로컬, MVP1)
    /// SPEC §8 허용 문구만 사용한다.
    /// </summary>
    public class ProfileUI : MonoBehaviour
    {
        [Header("루트 패널")]
        public GameObject panel;

        [Header("표시/편집")]
        public InputField nicknameInput;
        public Text totalPointsText;
        public Text defaultProjectText;

        [Header("버튼")]
        public Button saveNicknameButton;
        public Button changeDefaultProjectButton;
        public Button closeButton;
        public ProjectListUI projectListUI;

        [Header("로컬 저장 키")]
        public string nicknamePrefKey = "kg_nickname";
        public string totalPointsPrefKey = "kg_total_points";

        private void Start()
        {
            if (closeButton != null) closeButton.onClick.AddListener(Hide);
            if (saveNicknameButton != null) saveNicknameButton.onClick.AddListener(OnSaveNickname);
            if (changeDefaultProjectButton != null)
                changeDefaultProjectButton.onClick.AddListener(() => projectListUI?.Show());
            if (panel != null) panel.SetActive(false);
        }

        public void Show()
        {
            if (panel != null) panel.SetActive(true);
            Refresh();
        }

        public void Hide()
        {
            if (panel != null) panel.SetActive(false);
        }

        private void Refresh()
        {
            if (nicknameInput != null)
                nicknameInput.text = PlayerPrefs.GetString(nicknamePrefKey, "킵고잉러너");

            if (totalPointsText != null)
            {
                int total = PlayerPrefs.GetInt(totalPointsPrefKey, 0);
                totalPointsText.text = $"누적 기부 포인트 {total:N0}P";
            }

            if (defaultProjectText != null)
            {
                var p = GameManager.Instance?.Projects.Selected;
                defaultProjectText.text = p != null
                    ? $"기본 응원 프로젝트: {p.title}"
                    : "기본 응원 프로젝트를 선택해 주세요";
            }
        }

        private void OnSaveNickname()
        {
            if (nicknameInput == null) return;
            string nick = nicknameInput.text?.Trim() ?? "";

            // SPEC §5 setNickname: 2~12자 검증.
            if (nick.Length < 2 || nick.Length > 12)
            {
                Debug.LogWarning("[ProfileUI] 닉네임은 2~12자여야 합니다.");
                return;
            }

            PlayerPrefs.SetString(nicknamePrefKey, nick);
            PlayerPrefs.Save();
            Debug.Log($"[ProfileUI] 닉네임 저장: {nick}");
        }
    }
}
