using UnityEngine;

namespace KeepGoing.Player
{
    /// <summary>
    /// 3레인(-2, 0, 2) 사이의 가로 이동을 담당.
    /// 목표 레인으로 부드럽게 보간 이동한다.
    /// </summary>
    public class LaneMover : MonoBehaviour
    {
        /// <summary>레인의 X 좌표. SPEC: 3레인 = -2, 0, 2.</summary>
        public static readonly float[] LaneX = { -2f, 0f, 2f };

        [Tooltip("레인 전환 속도")]
        public float laneChangeSpeed = 12f;

        /// <summary>현재 레인 인덱스(0=왼쪽, 1=가운데, 2=오른쪽). 시작은 가운데.</summary>
        public int CurrentLane { get; private set; } = 1;

        private float _targetX;

        private void Awake()
        {
            CurrentLane = 1;
            _targetX = LaneX[CurrentLane];
            SnapToTarget();
        }

        private void Update()
        {
            // 목표 X 로 부드럽게 이동(다른 축은 PlayerController 가 점프/슬라이드로 제어).
            Vector3 p = transform.localPosition;
            p.x = Mathf.MoveTowards(p.x, _targetX, laneChangeSpeed * Time.deltaTime);
            transform.localPosition = p;
        }

        /// <summary>왼쪽 레인으로 한 칸 이동.</summary>
        public void MoveLeft()
        {
            SetLane(CurrentLane - 1);
        }

        /// <summary>오른쪽 레인으로 한 칸 이동.</summary>
        public void MoveRight()
        {
            SetLane(CurrentLane + 1);
        }

        /// <summary>레인 인덱스를 직접 설정(범위 제한).</summary>
        public void SetLane(int lane)
        {
            CurrentLane = Mathf.Clamp(lane, 0, LaneX.Length - 1);
            _targetX = LaneX[CurrentLane];
        }

        /// <summary>가운데 레인으로 즉시 리셋(런 시작 시).</summary>
        public void ResetToCenter()
        {
            SetLane(1);
            SnapToTarget();
        }

        private void SnapToTarget()
        {
            Vector3 p = transform.localPosition;
            p.x = _targetX;
            transform.localPosition = p;
        }
    }
}
