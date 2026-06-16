using UnityEngine;
using KeepGoing.Core;

namespace KeepGoing.SpecialStage
{
    /// <summary>특별 스테이지 수집물 종류. (SPEC §2 점수값 기준)</summary>
    public enum BrandItemType
    {
        Coin,       // 일반 브랜드 아이템 = 20점
        Billboard,  // 큰 브랜드 아이템 = 100점
        Heart,      // 하트 아이템 = 150점
        Golden      // 골든 아이템 = 500점
    }

    /// <summary>
    /// 특별(브랜드) 스테이지의 긍정적 수집 오브젝트.
    /// 브랜드는 "피해야 하는 것"이 아니라 "모으는 것"이다.
    /// - 브랜드 충돌로 사망하지 않는다.
    /// - 구매 유도/외부 링크 없음.
    /// 연속 수집 시 SpecialStageManager 가 수집 콤보 보너스를 적립한다.
    /// </summary>
    public class BrandCollectible : MonoBehaviour
    {
        public BrandItemType itemType = BrandItemType.Coin;

        [Tooltip("플레이어 쪽으로 다가오다 지나가면 제거되는 Z")]
        public float despawnZ = -6f;

        private bool _collected;

        /// <summary>아이템 종류별 점수값(SPEC §2). 표시/연출용.</summary>
        public int PointValue
        {
            get
            {
                return itemType switch
                {
                    BrandItemType.Coin => 20,
                    BrandItemType.Billboard => 100,
                    BrandItemType.Heart => 150,
                    BrandItemType.Golden => 500,
                    _ => 0
                };
            }
        }

        private void Update()
        {
            float speed = GameManager.Instance != null ? GameManager.Instance.CurrentSpeed : 8f;
            transform.position += Vector3.back * speed * Time.deltaTime;
            if (transform.position.z < despawnZ)
                Destroy(gameObject);
        }

        /// <summary>플레이어가 닿았을 때 수집 처리.</summary>
        public void Collect()
        {
            if (_collected) return;
            _collected = true;

            var gm = GameManager.Instance;
            if (gm != null)
            {
                switch (itemType)
                {
                    case BrandItemType.Coin: gm.Score.CollectNormalBrand(); break;
                    case BrandItemType.Billboard: gm.Score.CollectBigBrand(); break;
                    case BrandItemType.Heart: gm.Score.CollectHeart(); break;
                    case BrandItemType.Golden: gm.Score.CollectGolden(); break;
                }

                if (gm.specialStage != null)
                    gm.specialStage.OnItemCollected(this);
            }

            Destroy(gameObject);
        }
    }
}
