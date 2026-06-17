using UnityEngine;
using KeepGoing.Core;

namespace KeepGoing.SpecialStage
{
    /// <summary>
    /// 일정 거리마다 등장하는 브랜드 포털.
    /// 플레이어가 진입하면(트리거) 특별 스테이지로 전환된다.
    /// 포털 진입은 선택 사항이며, 진입하지 않고 지나쳐도 일반 플레이가 계속된다.
    /// </summary>
    public class BrandPortal : MonoBehaviour
    {
        [Tooltip("진입 시 시작할 특별 스테이지 ID (seed: stage-green-energy)")]
        public string stageId = "stage-green-energy";

        [Tooltip("플레이어를 지나치면 제거되는 Z")]
        public float despawnZ = -6f;

        private bool _entered;

        private void Update()
        {
            float speed = GameManager.Instance != null ? GameManager.Instance.CurrentSpeed : 8f;
            transform.position += Vector3.back * speed * Time.deltaTime;
            if (transform.position.z < despawnZ)
                Destroy(gameObject);
        }

        /// <summary>플레이어가 포털에 진입.</summary>
        public void Enter()
        {
            if (_entered) return;
            _entered = true;
            if (GameManager.Instance != null)
                GameManager.Instance.EnterSpecialStage(stageId);
            Destroy(gameObject);
        }
    }
}
