// 실제 Firebase 백엔드(Cloud Functions callable) 연결 구현.
//
// 주의: 이 파일은 Firebase Unity SDK(Auth + Functions)가 프로젝트에 임포트되어 있어야
//       컴파일됩니다. SDK 가 없는 환경(CI/리뷰 등)에서도 나머지 게임 코드가 깨지지 않도록
//       전체를 `KEEPGOING_FIREBASE` 심볼로 감쌌습니다.
//       Player Settings > Scripting Define Symbols 에 `KEEPGOING_FIREBASE` 를 추가하면
//       실제 구현이 컴파일됩니다(SETUP.md 참고).
//
// 매핑 대상 callable (region: asia-northeast3):
//   - getActiveSeason()  → { season, projects[] }
//   - startRun({ clientVersion })  → { runId, serverSeed, startedAt, clientVersion }
//   - finishRun({ ... })  → { ok, runId, validationStatus, donationPoints | rejectReason, ... }

#if KEEPGOING_FIREBASE
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Firebase.Functions;
using UnityEngine;

namespace KeepGoing.Firebase
{
    /// <summary>
    /// IRunApiClient 의 실제 Firebase 구현.
    /// FirebaseFunctions.DefaultInstance 의 HttpsCallable 로 백엔드 callable 을 호출하고
    /// SPEC §5 의 요청/응답 형태로 매핑한다. 게임 코드는 IRunApiClient 만 의존하므로
    /// 목 구현과 자유롭게 교체 가능하다.
    /// </summary>
    public class FirebaseRunApiClient : IRunApiClient
    {
        // 백엔드는 asia-northeast3 리전에 배포된다.
        private const string Region = "asia-northeast3";

        private readonly FirebaseFunctions _functions;

        public FirebaseRunApiClient()
        {
            // 리전을 명시해 callable 을 같은 리전에서 호출한다.
            _functions = FirebaseFunctions.GetInstance(Region);
        }

        public async Task<SeasonInfo> GetActiveSeasonAsync()
        {
            var callable = _functions.GetHttpsCallable("getActiveSeason");
            var result = await callable.CallAsync();
            var data = result.Data as IDictionary<object, object>;
            if (data == null) return null;

            var seasonObj = data.TryGetValue("season", out var s) ? s as IDictionary<object, object> : null;
            if (seasonObj == null) return null;

            return new SeasonInfo
            {
                seasonId = GetString(seasonObj, "seasonId"),
                title = GetString(seasonObj, "title"),
                description = GetString(seasonObj, "description"),
                status = GetString(seasonObj, "status"),
                donationPoolAmount = GetLong(seasonObj, "donationPoolAmount"),
            };
        }

        public async Task<StartRunResponse> StartRunAsync(StartRunRequest request)
        {
            var callable = _functions.GetHttpsCallable("startRun");
            var payload = new Dictionary<object, object>
            {
                { "clientVersion", request?.clientVersion ?? "unknown" },
            };

            var result = await callable.CallAsync(payload);
            var data = result.Data as IDictionary<object, object>;
            if (data == null)
            {
                throw new Exception("[FirebaseRunApi] startRun: 빈 응답입니다.");
            }

            return new StartRunResponse
            {
                runId = GetString(data, "runId"),
                serverSeed = GetString(data, "serverSeed"),
                // 백엔드는 startedAt 을 epoch millis(number)로 반환한다 → ISO 문자열로 변환.
                startedAt = MillisToIso(GetLong(data, "startedAt")),
            };
        }

        public async Task<FinishRunResponse> FinishRunAsync(FinishRunRequest req)
        {
            var callable = _functions.GetHttpsCallable("finishRun");

            // SPEC §5 finishRun 입력 필드를 그대로 매핑한다.
            var payload = new Dictionary<object, object>
            {
                { "runId", req.runId },
                { "distanceMeters", req.distanceMeters },
                { "durationSec", req.durationSec },
                { "gameScore", req.gameScore },
                { "donationPoints", req.donationPoints },
                { "normalStageScore", req.normalStageScore },
                { "specialStageScore", req.specialStageScore },
                { "obstaclesDodged", req.obstaclesDodged },
                { "maxCombo", req.maxCombo },
                { "specialStageEntered", req.specialStageEntered },
                { "selectedProjectId", req.selectedProjectId },
                { "clientVersion", req.clientVersion ?? "unknown" },
            };

            var result = await callable.CallAsync(payload);
            var data = result.Data as IDictionary<object, object>;
            if (data == null)
            {
                throw new Exception("[FirebaseRunApi] finishRun: 빈 응답입니다.");
            }

            var status = GetString(data, "validationStatus");
            var resp = new FinishRunResponse
            {
                runId = GetString(data, "runId"),
                validationStatus = status,
                rejectReason = GetString(data, "rejectReason"),
                // confirmed 일 때만 백엔드가 donationPoints 를 돌려준다.
                confirmedDonationPoints = (int)GetLong(data, "donationPoints"),
            };

            Debug.Log($"[FirebaseRunApi] finishRun → {resp.validationStatus} " +
                      $"(points={resp.confirmedDonationPoints})");
            return resp;
        }

        // ---------- 응답 파싱 헬퍼 (callable 은 Dictionary<object,object> 로 역직렬화) ----------

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

        private static string MillisToIso(long millis)
        {
            if (millis <= 0) return DateTime.UtcNow.ToString("o");
            return DateTimeOffset.FromUnixTimeMilliseconds(millis).UtcDateTime.ToString("o");
        }
    }
}
#endif
