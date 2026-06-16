using System;
using UnityEngine;
using KeepGoing.Core;
using KeepGoing.Player;

namespace KeepGoing.SpecialStage
{
    /// <summary>
    /// 특별(브랜드) 스테이지 매니저.
    /// - 고정 시간(기본 15초, seed durationSec=15) 동안 진행된다.
    /// - 사망이 없다(no death). 오직 브랜드 아이템을 "모으는" 데 집중.
    /// - 연속 수집 시 수집 콤보 보너스를 적립한다.
    /// - 시간이 끝나면 일반 스테이지로 복귀(onFinished 콜백).
    /// 수집물 스폰은 단순화하여 이 매니저가 직접 처리한다.
    /// </summary>
    public class SpecialStageManager : MonoBehaviour
    {
        [Header("프리팹")]
        public BrandCollectible coinPrefab;
        public BrandCollectible billboardPrefab;
        public BrandCollectible heartPrefab;
        public BrandCollectible goldenPrefab;

        [Header("설정")]
        [Tooltip("특별 스테이지 지속 시간(초). seed: durationSec=15")]
        public float durationSec = 15f;
        [Tooltip("수집물 스폰 간격(초)")]
        public float spawnInterval = 0.5f;
        [Tooltip("스폰 Z 거리")]
        public float spawnZ = 35f;
        [Tooltip("수집 콤보 1단계 보너스 점수(연속 수집 N개마다)")]
        public int collectionComboStep = 5;
        [Tooltip("수집 콤보가 끊기는 시간(초). 이 시간 안에 다음 수집이 없으면 콤보 리셋")]
        public float comboTimeout = 1.5f;

        public bool IsActive { get; private set; }
        public float TimeRemaining { get; private set; }
        public string CurrentStageId { get; private set; }

        private Action _onFinished;
        private float _spawnTimer;
        private int _collectStreak;       // 현재 연속 수집 수
        private float _lastCollectTime;

        private void Update()
        {
            if (!IsActive) return;

            TimeRemaining -= Time.deltaTime;

            // 수집 콤보 타임아웃 처리.
            if (_collectStreak > 0 && Time.time - _lastCollectTime > comboTimeout)
                _collectStreak = 0;

            // 수집물 스폰.
            _spawnTimer += Time.deltaTime;
            if (_spawnTimer >= spawnInterval)
            {
                _spawnTimer = 0f;
                SpawnCollectible();
            }

            if (TimeRemaining <= 0f)
                End();
        }

        /// <summary>특별 스테이지 시작.</summary>
        public void Begin(string stageId, Action onFinished)
        {
            CurrentStageId = stageId;
            _onFinished = onFinished;
            IsActive = true;
            TimeRemaining = durationSec;
            _spawnTimer = 0f;
            _collectStreak = 0;
            _lastCollectTime = Time.time;
        }

        /// <summary>BrandCollectible 가 수집될 때 호출 → 수집 콤보 보너스 적립.</summary>
        public void OnItemCollected(BrandCollectible item)
        {
            _collectStreak++;
            _lastCollectTime = Time.time;

            // 연속 수집이 일정 수에 도달할 때마다 콤보 보너스 적립.
            if (_collectStreak % 5 == 0 && GameManager.Instance != null)
            {
                GameManager.Instance.Score.AddCollectionCombo(collectionComboStep * (_collectStreak / 5));
            }
        }

        private void End()
        {
            IsActive = false;
            CleanupCollectibles();
            _onFinished?.Invoke();
            _onFinished = null;
        }

        private void SpawnCollectible()
        {
            // 종류 가중치: 코인이 가장 흔하고 골든은 희귀.
            float r = UnityEngine.Random.value;
            BrandCollectible prefab;
            if (r < 0.55f) prefab = coinPrefab;
            else if (r < 0.80f) prefab = billboardPrefab;
            else if (r < 0.95f) prefab = heartPrefab;
            else prefab = goldenPrefab;

            if (prefab == null) return;

            int lane = UnityEngine.Random.Range(0, LaneMover.LaneX.Length);
            Vector3 pos = new Vector3(LaneMover.LaneX[lane], 0.5f, spawnZ);
            Instantiate(prefab, pos, Quaternion.identity, transform);
        }

        private void CleanupCollectibles()
        {
            foreach (var c in FindObjectsOfType<BrandCollectible>())
                Destroy(c.gameObject);
        }
    }
}
