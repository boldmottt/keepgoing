// 실제 Firebase 백엔드 리더보드 조회 구현.
//
// 주의: Firebase Unity SDK(Functions) 필요. `KEEPGOING_FIREBASE` 심볼로 감쌌다(SETUP.md 참고).
//
// 매핑 대상 callable (region: asia-northeast3):
//   - getSeasonLeaderboard({ seasonId })   → { entries[] }  (entry: rank, nickname, avatarId, totalPoints, mainProjectId)
//   - getProjectLeaderboard({ projectId })  → { entries[] }  (entry: rank, nickname, avatarId, points)
//   - getDailyLeaderboard({ seasonId?, limit? }) → { dayStartMillis, entries[] }  (entry: rank, nickname, avatarId, points)

#if KEEPGOING_FIREBASE
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Firebase.Functions;

namespace KeepGoing.Firebase
{
    /// <summary>
    /// ILeaderboardService 의 실제 Firebase 구현.
    /// 백엔드 callable 응답을 LeaderboardEntry 리스트로 매핑한다.
    /// </summary>
    public class FirebaseLeaderboardService : ILeaderboardService
    {
        private const string Region = "asia-northeast3";
        private readonly FirebaseFunctions _functions;

        public FirebaseLeaderboardService()
        {
            _functions = FirebaseFunctions.GetInstance(Region);
        }

        public async Task<List<LeaderboardEntry>> GetSeasonLeaderboardAsync(string seasonId, int top = 50)
        {
            var callable = _functions.GetHttpsCallable("getSeasonLeaderboard");
            var result = await callable.CallAsync(new Dictionary<object, object>
            {
                { "seasonId", seasonId },
            });
            // 시즌 리더보드의 점수 필드는 totalPoints.
            return ParseEntries(result.Data, top, "totalPoints");
        }

        public async Task<List<LeaderboardEntry>> GetProjectLeaderboardAsync(string projectId, int top = 50)
        {
            var callable = _functions.GetHttpsCallable("getProjectLeaderboard");
            var result = await callable.CallAsync(new Dictionary<object, object>
            {
                { "projectId", projectId },
            });
            // 프로젝트 리더보드의 점수 필드는 points.
            return ParseEntries(result.Data, top, "points");
        }

        /// <summary>
        /// 오늘의 기부 포인트 리더보드(getDailyLeaderboard). 인터페이스 외 확장 메서드.
        /// 점수 필드는 points.
        /// </summary>
        public async Task<List<LeaderboardEntry>> GetDailyLeaderboardAsync(string seasonId = null, int top = 50)
        {
            var callable = _functions.GetHttpsCallable("getDailyLeaderboard");
            var payload = new Dictionary<object, object> { { "limit", top } };
            if (!string.IsNullOrEmpty(seasonId)) payload["seasonId"] = seasonId;

            var result = await callable.CallAsync(payload);
            return ParseEntries(result.Data, top, "points");
        }

        // ---------- 파싱 헬퍼 ----------

        private static List<LeaderboardEntry> ParseEntries(object data, int top, string pointsField)
        {
            var list = new List<LeaderboardEntry>();
            var dict = data as IDictionary<object, object>;
            if (dict == null || !dict.TryGetValue("entries", out var entriesObj)) return list;
            if (!(entriesObj is IEnumerable<object> entries)) return list;

            int count = 0;
            foreach (var item in entries)
            {
                if (count >= top) break;
                if (!(item is IDictionary<object, object> e)) continue;

                list.Add(new LeaderboardEntry
                {
                    uid = null, // 백엔드는 개인정보(uid) 를 노출하지 않는다.
                    nickname = GetString(e, "nickname"),
                    avatarId = GetString(e, "avatarId"),
                    totalPoints = GetLong(e, pointsField),
                    mainProjectId = GetString(e, "mainProjectId"),
                    rank = (int)GetLong(e, "rank"),
                });
                count++;
            }
            return list;
        }

        private static string GetString(IDictionary<object, object> d, string key)
        {
            return d != null && d.TryGetValue(key, out var v) && v != null ? v.ToString() : null;
        }

        private static long GetLong(IDictionary<object, object> d, string key)
        {
            if (d == null || !d.TryGetValue(key, out var v) || v == null) return 0L;
            try { return Convert.ToInt64(v); }
            catch { return 0L; }
        }
    }
}
#endif
