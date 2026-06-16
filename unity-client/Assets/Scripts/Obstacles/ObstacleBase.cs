using UnityEngine;
using KeepGoing.Core;
using KeepGoing.Player;

namespace KeepGoing.Obstacles
{
    /// <summary>회피 방법 종류.</summary>
    public enum AvoidMethod
    {
        ChangeLane,  // 레인을 바꿔야 피할 수 있음 (가짜 광고판)
        Jump,        // 점프로 넘어야 함 (낮은 배너)
        Slide        // 슬라이드로 지나가야 함 (위에 매달린 팝업)
    }

    /// <summary>
    /// 모든 장애물의 베이스 클래스.
    /// 일반 스테이지의 장애물은 "가짜/패러디 광고"이며 피해야 하는 대상이다.
    /// (실제 브랜드 아님. 실제 브랜드는 특별 스테이지의 긍정적 수집물로만 등장.)
    /// 장애물은 플레이어 쪽으로 다가오며(월드가 스크롤되는 대신 장애물이 이동),
    /// 플레이어를 지나치면 회피 성공으로 처리하고 콤보를 올린다.
    /// </summary>
    public abstract class ObstacleBase : MonoBehaviour
    {
        [Tooltip("이 장애물을 피하기 위한 올바른 행동")]
        public AvoidMethod avoidMethod = AvoidMethod.ChangeLane;

        [Tooltip("화면 밖(플레이어 뒤)으로 사라지는 Z 좌표")]
        public float despawnZ = -6f;

        [Tooltip("아슬아슬 회피로 인정되는 거리(near-miss)")]
        public float nearMissRange = 0.6f;

        private bool _counted;     // 회피/충돌 중복 집계 방지
        private bool _passedPlayer;

        /// <summary>패러디 광고 문구(가짜). UI/로그용. 실제 브랜드명 사용 금지.</summary>
        public abstract string ParodyLabel { get; }

        protected virtual void Update()
        {
            // 장애물이 플레이어(Z=0 근처)를 향해 다가온다.
            float speed = GameManager.Instance != null ? GameManager.Instance.CurrentSpeed : 8f;
            transform.position += Vector3.back * speed * Time.deltaTime;

            // 플레이어를 지나쳤고 충돌 없이 통과 → 회피 성공.
            if (!_passedPlayer && transform.position.z < 0f)
            {
                _passedPlayer = true;
                MarkDodged();
            }

            if (transform.position.z < despawnZ)
                Destroy(gameObject);
        }

        /// <summary>
        /// 이 장애물이 플레이어의 현재 행동으로 회피되는지 판정.
        /// PlayerController.OnTriggerEnter 에서 충돌 무시 여부를 결정할 때 사용.
        /// </summary>
        public virtual bool CanBeAvoidedBy(PlayerController player)
        {
            switch (avoidMethod)
            {
                case AvoidMethod.Jump:
                    return player.IsJumping;
                case AvoidMethod.Slide:
                    return player.IsSliding;
                case AvoidMethod.ChangeLane:
                    // 같은 레인이 아니면 피한 것.
                    return player.CurrentLane != GetComponentLane();
                default:
                    return false;
            }
        }

        /// <summary>장애물이 위치한 레인 인덱스(가장 가까운 레인).</summary>
        public int GetComponentLane()
        {
            float x = transform.position.x;
            int best = 0;
            float bestDist = Mathf.Abs(x - LaneMover.LaneX[0]);
            for (int i = 1; i < LaneMover.LaneX.Length; i++)
            {
                float d = Mathf.Abs(x - LaneMover.LaneX[i]);
                if (d < bestDist) { bestDist = d; best = i; }
            }
            return best;
        }

        /// <summary>회피 성공 집계(점수/콤보 + near-miss 보너스).</summary>
        private void MarkDodged()
        {
            if (_counted) return;
            _counted = true;

            var gm = GameManager.Instance;
            if (gm == null) return;

            gm.Score.OnObstacleDodged();

            // near-miss: 같은 레인이었지만 점프/슬라이드로 아슬하게 피한 경우.
            if (avoidMethod != AvoidMethod.ChangeLane &&
                gm.player != null && gm.player.CurrentLane == GetComponentLane())
            {
                gm.Score.AddNearMiss();
            }
        }
    }
}
