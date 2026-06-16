using UnityEngine;
using KeepGoing.Player;
using KeepGoing.SpecialStage;

namespace KeepGoing.Obstacles
{
    /// <summary>
    /// 거리/속도 기반 장애물 스포너.
    /// - 일정 거리(spawnEveryMeters)마다 장애물을 생성한다.
    /// - 속도가 빨라질수록 생성 간격(미터)을 약간 줄여 난이도를 올린다.
    /// - 항상 회피 가능한 배치를 보장한다(한 레인은 비워둠).
    /// 프리팹은 인스펙터에서 연결한다(billboard/banner/popup).
    /// </summary>
    public class ObstacleSpawner : MonoBehaviour
    {
        [Header("프리팹")]
        public BillboardObstacle billboardPrefab;
        public BannerObstacle bannerPrefab;
        public PopupObstacle popupPrefab;
        public BrandPortal brandPortalPrefab;

        [Header("스폰 설정")]
        [Tooltip("기본 스폰 간격(m)")]
        public float spawnEveryMeters = 14f;
        [Tooltip("속도 1m/s 당 줄어드는 간격(m). 난이도 스케일")]
        public float spawnTightenPerSpeed = 0.2f;
        [Tooltip("최소 스폰 간격(m)")]
        public float minSpawnEveryMeters = 6f;
        [Tooltip("장애물이 생성되는 Z 거리(플레이어 앞)")]
        public float spawnZ = 40f;

        private float _distanceSinceSpawn;
        private bool _portalRequested;

        /// <summary>런 시작 시 초기화.</summary>
        public void ResetSpawner()
        {
            _distanceSinceSpawn = 0f;
            _portalRequested = false;

            // 씬에 남아있는 장애물 제거.
            foreach (var o in FindObjectsOfType<ObstacleBase>())
                Destroy(o.gameObject);
            foreach (var p in FindObjectsOfType<BrandPortal>())
                Destroy(p.gameObject);
        }

        /// <summary>GameManager 가 매 프레임 호출. advanced = 이번 프레임 진행 거리(m).</summary>
        public void Tick(float dt, float speed, float advanced)
        {
            _distanceSinceSpawn += advanced;

            float interval = Mathf.Max(minSpawnEveryMeters,
                spawnEveryMeters - speed * spawnTightenPerSpeed);

            if (_distanceSinceSpawn >= interval)
            {
                _distanceSinceSpawn -= interval;

                if (_portalRequested)
                {
                    SpawnBrandPortal();
                    _portalRequested = false;
                }
                else
                {
                    SpawnObstacle();
                }
            }
        }

        /// <summary>다음 스폰 타이밍에 브랜드 포털을 등장시키도록 예약.</summary>
        public void RequestBrandPortal()
        {
            _portalRequested = true;
        }

        private void SpawnObstacle()
        {
            // 장애물 종류 무작위.
            int kind = Random.Range(0, 3);
            ObstacleBase prefab = kind switch
            {
                0 => billboardPrefab,
                1 => bannerPrefab,
                _ => (ObstacleBase)popupPrefab
            };
            if (prefab == null) return;

            int lane = Random.Range(0, LaneMover.LaneX.Length);
            Vector3 pos = new Vector3(LaneMover.LaneX[lane], 0f, spawnZ);
            Instantiate(prefab, pos, Quaternion.identity, transform);
        }

        private void SpawnBrandPortal()
        {
            if (brandPortalPrefab == null) return;
            // 포털은 가운데 레인에 배치하여 발견/진입을 쉽게.
            Vector3 pos = new Vector3(LaneMover.LaneX[1], 0f, spawnZ);
            Instantiate(brandPortalPrefab, pos, Quaternion.identity, transform);
        }
    }
}
