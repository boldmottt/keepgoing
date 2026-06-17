using System.Threading.Tasks;
using UnityEngine;

namespace KeepGoing.Firebase
{
    /// <summary>
    /// Firebase 접근 진입점(파사드).
    ///
    /// MVP1: useFirebaseBackend=false 로 로컬 목 구현을 제공한다(서버/SDK 불필요, 오프라인/에디터 기본값).
    /// MVP2: useFirebaseBackend=true 로 실제 Firebase 구현(FirebaseRunApiClient,
    ///       FirebaseLeaderboardService)을 연결한다. 게임 코드는 IRunApiClient/ILeaderboardService
    ///       인터페이스에만 의존하므로 코드 변경 없이 교체된다.
    ///
    /// 실제 Firebase 구현은 Firebase Unity SDK(Auth + Functions) 가 임포트되고
    /// `KEEPGOING_FIREBASE` Scripting Define Symbol 이 설정된 경우에만 컴파일된다(SETUP.md 참고).
    /// SDK 가 없으면 useFirebaseBackend 가 true 여도 안전하게 목으로 폴백한다.
    /// </summary>
    public class FirebaseManager
    {
        public IRunApiClient RunApi { get; private set; }
        public ILeaderboardService Leaderboard { get; private set; }

        /// <summary>현재 목 구현으로 동작 중인지 여부.</summary>
        public bool IsMock { get; private set; }

        /// <summary>Firebase 초기화/익명 로그인이 완료되었는지 여부(목 모드는 항상 true).</summary>
        public bool IsReady { get; private set; }

        /// <summary>익명 로그인으로 발급된 uid(목 모드는 null).</summary>
        public string Uid { get; private set; }

        /// <summary>
        /// 생성자. useFirebaseBackend 로 백엔드 선택.
        /// 실제 연결은 InitializeAsync() 호출 시 수행된다(목 모드는 즉시 준비됨).
        /// </summary>
        public FirebaseManager(bool useFirebaseBackend = false)
        {
            if (useFirebaseBackend)
            {
                ConfigureFirebaseBackend();
            }
            else
            {
                ConfigureMockBackend();
            }
        }

        private void ConfigureMockBackend()
        {
            RunApi = new MockRunApiClient();
            Leaderboard = new MockLeaderboardService();
            IsMock = true;
            IsReady = true;
        }

        private void ConfigureFirebaseBackend()
        {
#if KEEPGOING_FIREBASE
            RunApi = new FirebaseRunApiClient();
            Leaderboard = new FirebaseLeaderboardService();
            IsMock = false;
            IsReady = false; // InitializeAsync 완료 시 true.
#else
            // SDK 미임포트: 안전하게 목으로 폴백한다.
            Debug.LogWarning("[FirebaseManager] KEEPGOING_FIREBASE 심볼이 없어 목 구현으로 폴백합니다. " +
                             "Firebase Unity SDK 임포트 후 Scripting Define Symbol 을 추가하세요(SETUP.md).");
            ConfigureMockBackend();
#endif
        }

        /// <summary>
        /// Firebase 초기화 + 익명 로그인. 게임 시작 시 한 번 await 한다.
        /// 목 모드에서는 아무 것도 하지 않고 즉시 완료된다.
        /// </summary>
        public async Task InitializeAsync()
        {
            if (IsMock)
            {
                IsReady = true;
                return;
            }

#if KEEPGOING_FIREBASE
            // 1. Firebase 의존성 확인/복구.
            var depStatus = await global::Firebase.FirebaseApp.CheckAndFixDependenciesAsync();
            if (depStatus != global::Firebase.DependencyStatus.Available)
            {
                Debug.LogError($"[FirebaseManager] Firebase 의존성 사용 불가: {depStatus}. 목으로 폴백합니다.");
                ConfigureMockBackend();
                return;
            }

            // 2. 익명 인증으로 로그인(SPEC: 익명 Auth).
            var auth = global::Firebase.Auth.FirebaseAuth.DefaultInstance;
            var authResult = await auth.SignInAnonymouslyAsync();
            Uid = authResult.User?.UserId;
            Debug.Log($"[FirebaseManager] 익명 로그인 완료 uid={Uid}");

            IsReady = true;
#else
            await Task.CompletedTask;
            IsReady = true;
#endif
        }
    }
}
