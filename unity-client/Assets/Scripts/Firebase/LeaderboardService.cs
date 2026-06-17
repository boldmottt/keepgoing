using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace KeepGoing.Firebase
{
    /// <summary>리더보드 1개 항목 (SPEC §4 leaderboards / projectLeaderboards).</summary>
    [Serializable]
    public class LeaderboardEntry
    {
        public string uid;
        public string nickname;
        public string avatarId;
        public long totalPoints;
        public string mainProjectId;
        public int rank;
    }

    /// <summary>
    /// 리더보드 조회 추상화.
    /// MVP1: 로컬 목, MVP2: Firestore leaderboards/{seasonId}/entries 조회로 교체.
    /// </summary>
    public interface ILeaderboardService
    {
        Task<List<LeaderboardEntry>> GetSeasonLeaderboardAsync(string seasonId, int top = 50);
        Task<List<LeaderboardEntry>> GetProjectLeaderboardAsync(string projectId, int top = 50);
        Task<List<LeaderboardEntry>> GetDailyLeaderboardAsync(string seasonId, int top = 50);
    }

    /// <summary>로컬 목 리더보드. 더미 데이터를 점수 내림차순으로 반환한다.</summary>
    public class MockLeaderboardService : ILeaderboardService
    {
        private readonly List<LeaderboardEntry> _entries = new List<LeaderboardEntry>
        {
            new LeaderboardEntry { uid="u1", nickname="달리는곰", avatarId="a1", totalPoints=12500, mainProjectId="project-animals" },
            new LeaderboardEntry { uid="u2", nickname="점프왕", avatarId="a2", totalPoints=9800, mainProjectId="project-children" },
            new LeaderboardEntry { uid="u3", nickname="콤보러", avatarId="a3", totalPoints=8700, mainProjectId="project-forest" },
            new LeaderboardEntry { uid="u4", nickname="초록숲지킴이", avatarId="a4", totalPoints=6400, mainProjectId="project-forest" },
            new LeaderboardEntry { uid="u5", nickname="기부고잉", avatarId="a5", totalPoints=5200, mainProjectId="project-animals" },
        };

        public Task<List<LeaderboardEntry>> GetSeasonLeaderboardAsync(string seasonId, int top = 50)
        {
            var ranked = RankCopy(_entries).Take(top).ToList();
            return Task.FromResult(ranked);
        }

        public Task<List<LeaderboardEntry>> GetProjectLeaderboardAsync(string projectId, int top = 50)
        {
            var filtered = _entries.Where(e => e.mainProjectId == projectId);
            var ranked = RankCopy(filtered).Take(top).ToList();
            return Task.FromResult(ranked);
        }

        public Task<List<LeaderboardEntry>> GetDailyLeaderboardAsync(string seasonId, int top = 50)
        {
            // 목: 오늘의 리더보드를 시즌 전체 더미로 근사한다(오프라인/에디터용).
            var ranked = RankCopy(_entries).Take(top).ToList();
            return Task.FromResult(ranked);
        }

        private static List<LeaderboardEntry> RankCopy(IEnumerable<LeaderboardEntry> source)
        {
            var sorted = source.OrderByDescending(e => e.totalPoints).ToList();
            for (int i = 0; i < sorted.Count; i++)
            {
                // 원본 변형을 막기 위해 복사본에 순위를 매긴다.
                sorted[i] = new LeaderboardEntry
                {
                    uid = sorted[i].uid,
                    nickname = sorted[i].nickname,
                    avatarId = sorted[i].avatarId,
                    totalPoints = sorted[i].totalPoints,
                    mainProjectId = sorted[i].mainProjectId,
                    rank = i + 1
                };
            }
            return sorted;
        }
    }
}
