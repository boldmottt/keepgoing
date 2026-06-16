using System;
using System.Collections.Generic;
using System.Linq;

namespace KeepGoing.Donation
{
    /// <summary>
    /// 기부 프로젝트 정보(SPEC §4 donationProjects 필드 요약).
    /// 순수 데이터 클래스이며 직렬화 가능(서버 응답으로도 채울 수 있음).
    /// </summary>
    [Serializable]
    public class DonationProject
    {
        public string projectId;
        public string seasonId;
        public string title;
        public string description;
        public string organizationName;
        public string imageUrl;
        public long targetAmount;
        public long confirmedPoints;
        public long estimatedDonationAmount;
        public int participantCount;
        public string status; // active | inactive | completed

        public bool IsActive => status == "active";
    }

    /// <summary>
    /// 기부 프로젝트 목록 서비스.
    /// MVP1: seed-data.json 의 더미 3개 프로젝트를 로컬로 보유한다.
    /// MVP2: getActiveSeason() 서버 응답으로 LoadFrom(...) 만 교체하면 된다.
    /// </summary>
    public class DonationProjectService
    {
        private readonly List<DonationProject> _projects = new List<DonationProject>();

        /// <summary>유저가 선택한 기부 프로젝트 ID(기본값 = 첫 active 프로젝트).</summary>
        public string SelectedProjectId { get; private set; }

        /// <summary>프로젝트 선택이 바뀌면 호출.</summary>
        public event Action<string> OnSelectionChanged;

        public DonationProjectService()
        {
            LoadDummyProjects();
        }

        /// <summary>현재 프로젝트 목록(읽기 전용).</summary>
        public IReadOnlyList<DonationProject> Projects => _projects;

        /// <summary>seed-data.json 의 더미 프로젝트 3개를 로드.</summary>
        private void LoadDummyProjects()
        {
            _projects.Clear();
            _projects.Add(new DonationProject
            {
                projectId = "project-animals",
                seasonId = "beta-season-1",
                title = "유기동물 보호",
                description = "버려진 동물들에게 안전한 보금자리와 치료를 제공합니다.",
                organizationName = "함께동물보호소",
                imageUrl = "",
                targetAmount = 500000,
                status = "active"
            });
            _projects.Add(new DonationProject
            {
                projectId = "project-children",
                seasonId = "beta-season-1",
                title = "결식아동 식사 지원",
                description = "끼니를 거르는 아이들에게 따뜻한 한 끼를 전합니다.",
                organizationName = "따뜻한한끼재단",
                imageUrl = "",
                targetAmount = 300000,
                status = "active"
            });
            _projects.Add(new DonationProject
            {
                projectId = "project-forest",
                seasonId = "beta-season-1",
                title = "숲 복원 프로젝트",
                description = "훼손된 숲에 나무를 심어 생태계를 되살립니다.",
                organizationName = "초록숲협회",
                imageUrl = "",
                targetAmount = 200000,
                status = "active"
            });

            // 기본 선택 = 첫 번째 active 프로젝트.
            SelectedProjectId = _projects.FirstOrDefault(p => p.IsActive)?.projectId;
        }

        /// <summary>MVP2: 서버에서 받은 프로젝트 목록으로 교체.</summary>
        public void LoadFrom(IEnumerable<DonationProject> projects)
        {
            _projects.Clear();
            _projects.AddRange(projects);
            if (string.IsNullOrEmpty(SelectedProjectId) ||
                _projects.All(p => p.projectId != SelectedProjectId))
            {
                SelectedProjectId = _projects.FirstOrDefault(p => p.IsActive)?.projectId;
            }
        }

        /// <summary>ID 로 프로젝트 조회.</summary>
        public DonationProject GetById(string projectId)
        {
            return _projects.FirstOrDefault(p => p.projectId == projectId);
        }

        /// <summary>유저가 기부할 프로젝트를 선택. active 프로젝트만 허용.</summary>
        public bool Select(string projectId)
        {
            var p = GetById(projectId);
            if (p == null || !p.IsActive) return false;
            SelectedProjectId = projectId;
            OnSelectionChanged?.Invoke(projectId);
            return true;
        }

        /// <summary>현재 선택된 프로젝트 객체.</summary>
        public DonationProject Selected => GetById(SelectedProjectId);
    }
}
