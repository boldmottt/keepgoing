using System;
using System.Threading.Tasks;
using UnityEngine;

namespace KeepGoing.Firebase
{
    // ---------- 요청/응답 DTO (SPEC §5) ----------

    [Serializable]
    public class StartRunRequest
    {
        public string clientVersion;
    }

    [Serializable]
    public class StartRunResponse
    {
        public string runId;
        public string serverSeed;
        public string startedAt;
    }

    [Serializable]
    public class FinishRunRequest
    {
        public string runId;
        public int distanceMeters;
        public int durationSec;
        public int gameScore;
        public int donationPoints;
        public int normalStageScore;
        public int specialStageScore;
        public int obstaclesDodged;
        public int maxCombo;
        public bool specialStageEntered;
        public string selectedProjectId;
        public string clientVersion;
    }

    [Serializable]
    public class FinishRunResponse
    {
        public string runId;
        public string validationStatus; // pending | confirmed | rejected
        public string rejectReason;
        public int confirmedDonationPoints;
    }

    [Serializable]
    public class SeasonInfo
    {
        public string seasonId;
        public string title;
        public string description;
        public string status;       // draft | active | closed | donated
        public long donationPoolAmount;
    }

    /// <summary>
    /// 런(run) 관련 서버 API 추상화 (SPEC §5).
    /// MVP1: 로컬 목 구현, MVP2: Firebase Callable Functions 구현으로 교체.
    /// 게임 코드는 이 인터페이스에만 의존한다.
    /// </summary>
    public interface IRunApiClient
    {
        Task<SeasonInfo> GetActiveSeasonAsync();
        Task<StartRunResponse> StartRunAsync(StartRunRequest request);
        Task<FinishRunResponse> FinishRunAsync(FinishRunRequest request);
    }

    /// <summary>
    /// 로컬 목 구현. 서버 없이 오프라인 동작을 위한 기본 클라이언트.
    /// 클라이언트 측에서도 SPEC §6 검증 규칙을 흉내내어 합리성 검사를 한다.
    /// </summary>
    public class MockRunApiClient : IRunApiClient
    {
        private const float MaxAllowedSpeed = 30f;       // m/s
        private const int DailyDonationPointCap = 100000;

        public Task<SeasonInfo> GetActiveSeasonAsync()
        {
            // seed-data.json 의 베타 시즌 1.
            var season = new SeasonInfo
            {
                seasonId = "beta-season-1",
                title = "킵고잉 베타 시즌 1",
                description = "킵고잉의 첫 베타 시즌입니다. 달리고, 피하고, 모아서 기부 포인트를 쌓아보세요.",
                status = "active",
                donationPoolAmount = 1000000
            };
            return Task.FromResult(season);
        }

        public Task<StartRunResponse> StartRunAsync(StartRunRequest request)
        {
            var resp = new StartRunResponse
            {
                runId = Guid.NewGuid().ToString(),
                serverSeed = Guid.NewGuid().ToString("N"),
                startedAt = DateTime.UtcNow.ToString("o")
            };
            return Task.FromResult(resp);
        }

        public Task<FinishRunResponse> FinishRunAsync(FinishRunRequest req)
        {
            var resp = new FinishRunResponse { runId = req.runId };

            // SPEC §6 점수 검증(클라이언트 측 사전 검사; 서버가 최종 판정).
            bool valid =
                req.durationSec > 0 &&
                req.distanceMeters >= 0 &&
                req.gameScore >= 0 &&
                req.donationPoints == Mathf.FloorToInt(req.gameScore * 0.1f) &&
                req.distanceMeters <= req.durationSec * MaxAllowedSpeed &&
                req.donationPoints <= DailyDonationPointCap;

            if (valid)
            {
                resp.validationStatus = "confirmed";
                resp.confirmedDonationPoints = req.donationPoints;
            }
            else
            {
                resp.validationStatus = "rejected";
                resp.rejectReason = "invalid_score";
                resp.confirmedDonationPoints = 0;
            }

            Debug.Log($"[MockRunApi] finishRun → {resp.validationStatus} " +
                      $"(score={req.gameScore}, points={req.donationPoints})");
            return Task.FromResult(resp);
        }
    }
}
