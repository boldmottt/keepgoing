using UnityEngine;
using KeepGoing.Core;

namespace KeepGoing.Player
{
    /// <summary>
    /// 플레이어 캐릭터 컨트롤러.
    /// - 좌/우 레인 이동 (LaneMover 위임)
    /// - 점프 / 슬라이드 (간단한 수직 이동 + 상태 타이머)
    /// - 장애물 충돌 → GameOver, 수집물/포털 트리거 처리
    /// 실제 물리는 단순화(Rigidbody 없이 수동 보간)하여 결정적이고 테스트하기 쉽게 했다.
    /// </summary>
    [RequireComponent(typeof(LaneMover))]
    public class PlayerController : MonoBehaviour
    {
        [Header("점프/슬라이드")]
        public float jumpHeight = 2.2f;
        public float jumpDuration = 0.6f;
        public float slideDuration = 0.6f;

        private LaneMover _lane;
        private float _baseY;
        private float _actionTimer;       // 점프/슬라이드 남은 시간
        private PlayerAction _action = PlayerAction.None;

        private enum PlayerAction { None, Jump, Slide }

        public bool IsJumping => _action == PlayerAction.Jump;
        public bool IsSliding => _action == PlayerAction.Slide;
        public int CurrentLane => _lane != null ? _lane.CurrentLane : 1;

        private void Awake()
        {
            _lane = GetComponent<LaneMover>();
            _baseY = transform.localPosition.y;
        }

        private void Update()
        {
            UpdateAction(Time.deltaTime);
        }

        // ---------- 입력에서 호출되는 행동 ----------

        public void MoveLeft() => _lane.MoveLeft();
        public void MoveRight() => _lane.MoveRight();

        public void Jump()
        {
            if (_action != PlayerAction.None) return; // 점프/슬라이드 중에는 무시
            _action = PlayerAction.Jump;
            _actionTimer = jumpDuration;
        }

        public void Slide()
        {
            if (_action != PlayerAction.None) return;
            _action = PlayerAction.Slide;
            _actionTimer = slideDuration;
        }

        /// <summary>런 시작 시 상태 초기화.</summary>
        public void ResetPlayer()
        {
            _action = PlayerAction.None;
            _actionTimer = 0f;
            _lane.ResetToCenter();
            Vector3 p = transform.localPosition;
            p.y = _baseY;
            transform.localPosition = p;
        }

        private void UpdateAction(float dt)
        {
            if (_action == PlayerAction.None) return;

            _actionTimer -= dt;
            Vector3 p = transform.localPosition;

            if (_action == PlayerAction.Jump)
            {
                // 0→1→0 의 포물선 형태로 점프 높이 보간.
                float t = 1f - Mathf.Clamp01(_actionTimer / jumpDuration);
                float arc = Mathf.Sin(t * Mathf.PI); // 0..1..0
                p.y = _baseY + arc * jumpHeight;
            }
            else if (_action == PlayerAction.Slide)
            {
                // 슬라이드 동안 살짝 낮춘다(콜라이더 조정은 실제 프리팹에서).
                p.y = _baseY - 0.4f;
            }

            transform.localPosition = p;

            if (_actionTimer <= 0f)
            {
                _action = PlayerAction.None;
                p.y = _baseY;
                transform.localPosition = p;
            }
        }

        // ---------- 충돌/트리거 ----------

        private void OnTriggerEnter(Collider other)
        {
            // 장애물 충돌 → 게임 오버 (일반 스테이지에서만 사망).
            var obstacle = other.GetComponent<Obstacles.ObstacleBase>();
            if (obstacle != null)
            {
                if (obstacle.CanBeAvoidedBy(this))
                    return; // 점프/슬라이드/레인으로 회피한 경우 충돌 무시
                if (GameManager.Instance != null && GameManager.Instance.State == GameState.Playing)
                {
                    GameManager.Instance.Score.ResetCombo();
                    GameManager.Instance.GameOver();
                }
                return;
            }

            // 특별 스테이지 수집물.
            var collectible = other.GetComponent<SpecialStage.BrandCollectible>();
            if (collectible != null)
            {
                collectible.Collect();
                return;
            }

            // 브랜드 포털 진입.
            var portal = other.GetComponent<SpecialStage.BrandPortal>();
            if (portal != null)
            {
                portal.Enter();
            }
        }
    }
}
