namespace KeepGoing.Firebase
{
    /// <summary>
    /// Firebase 접근 진입점(파사드).
    /// MVP1: useMock=true 로 로컬 목 구현을 제공한다(서버/Firebase SDK 불필요).
    /// MVP2: useMock=false 분기에 실제 Firebase 구현(FirebaseRunApiClient,
    ///       FirestoreLeaderboardService 등)을 연결하면 게임 코드 변경 없이 교체 가능.
    /// </summary>
    public class FirebaseManager
    {
        public IRunApiClient RunApi { get; private set; }
        public ILeaderboardService Leaderboard { get; private set; }
        public bool IsMock { get; private set; }

        public FirebaseManager(bool useMock = true)
        {
            IsMock = useMock;

            if (useMock)
            {
                RunApi = new MockRunApiClient();
                Leaderboard = new MockLeaderboardService();
            }
            else
            {
                // MVP2 연결 지점:
                //   RunApi = new FirebaseRunApiClient();      // Functions callable
                //   Leaderboard = new FirestoreLeaderboardService();
                // 아직 구현되지 않았으므로 목으로 폴백한다.
                RunApi = new MockRunApiClient();
                Leaderboard = new MockLeaderboardService();
            }
        }
    }
}
