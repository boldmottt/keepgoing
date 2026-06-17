using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using KeepGoing.Core;
using KeepGoing.Donation;

namespace KeepGoing.UI
{
    /// <summary>
    /// 기부 프로젝트 목록 화면.
    /// 프로젝트 카드를 나열하고, 유저가 응원할 프로젝트를 선택한다.
    /// SPEC §8 허용 문구("프로젝트 응원하기", "포인트 보내기")만 사용한다.
    /// </summary>
    public class ProjectListUI : MonoBehaviour
    {
        [Header("루트 패널")]
        public GameObject panel;

        [Header("리스트")]
        [Tooltip("프로젝트 카드 프리팹 (ProjectCardUI 포함)")]
        public ProjectCardUI cardPrefab;
        [Tooltip("카드가 배치될 부모 Transform (보통 ScrollView Content)")]
        public Transform contentParent;

        [Header("버튼")]
        public Button closeButton;

        private readonly List<ProjectCardUI> _cards = new List<ProjectCardUI>();

        private void Start()
        {
            if (closeButton != null) closeButton.onClick.AddListener(Hide);
            if (panel != null) panel.SetActive(false);
        }

        /// <summary>목록 화면 표시 + 갱신.</summary>
        public void Show()
        {
            if (panel != null) panel.SetActive(true);
            Rebuild();
        }

        public void Hide()
        {
            if (panel != null) panel.SetActive(false);
        }

        private void Rebuild()
        {
            var gm = GameManager.Instance;
            if (gm == null || cardPrefab == null || contentParent == null) return;

            // 기존 카드 정리.
            foreach (var c in _cards)
                if (c != null) Destroy(c.gameObject);
            _cards.Clear();

            foreach (var project in gm.Projects.Projects)
            {
                var card = Instantiate(cardPrefab, contentParent);
                bool isSelected = project.projectId == gm.Projects.SelectedProjectId;
                card.Bind(project, isSelected, OnSelectProject);
                _cards.Add(card);
            }
        }

        private void OnSelectProject(string projectId)
        {
            var gm = GameManager.Instance;
            if (gm == null) return;
            if (gm.Projects.Select(projectId))
                Rebuild(); // 선택 상태 반영
        }
    }

    /// <summary>
    /// 프로젝트 카드 1개 컨트롤러. ProjectListUI 에서 Instantiate 하여 사용.
    /// </summary>
    public class ProjectCardUI : MonoBehaviour
    {
        public Text titleText;
        public Text orgText;
        public Text descText;
        public Button selectButton;       // "이 프로젝트 응원하기"
        public GameObject selectedBadge;  // 선택됨 표시

        private string _projectId;
        private System.Action<string> _onSelect;

        public void Bind(DonationProject project, bool isSelected, System.Action<string> onSelect)
        {
            _projectId = project.projectId;
            _onSelect = onSelect;

            if (titleText != null) titleText.text = project.title;
            if (orgText != null) orgText.text = project.organizationName;
            if (descText != null) descText.text = project.description;
            if (selectedBadge != null) selectedBadge.SetActive(isSelected);

            if (selectButton != null)
            {
                selectButton.onClick.RemoveAllListeners();
                selectButton.onClick.AddListener(() => _onSelect?.Invoke(_projectId));
                var label = selectButton.GetComponentInChildren<Text>();
                if (label != null)
                    label.text = isSelected ? "응원 중" : "이 프로젝트 응원하기";
            }
        }
    }
}
