using System;
using UnityEngine;

namespace KeepGoing.Core
{
    /// <summary>입력 방향(스와이프/키보드).</summary>
    public enum SwipeDirection
    {
        None,
        Left,
        Right,
        Up,
        Down
    }

    /// <summary>
    /// 스와이프 입력 감지 매니저.
    /// - 모바일: 터치 스와이프(상/하/좌/우)
    /// - 에디터/PC: 키보드 화살표(또는 WASD) 폴백
    /// 매 프레임 OnSwipe 이벤트를 발생시킨다.
    /// </summary>
    public class InputManager : MonoBehaviour
    {
        [Tooltip("스와이프로 인정할 최소 픽셀 이동 거리")]
        public float minSwipeDistance = 50f;

        /// <summary>스와이프(혹은 키 입력) 발생 시 호출되는 이벤트.</summary>
        public event Action<SwipeDirection> OnSwipe;

        private Vector2 _touchStart;
        private bool _isTracking;

        private void Update()
        {
            HandleTouch();
            HandleKeyboard();
        }

        /// <summary>터치 스와이프 처리(모바일).</summary>
        private void HandleTouch()
        {
            if (Input.touchCount == 0) return;

            Touch touch = Input.GetTouch(0);
            switch (touch.phase)
            {
                case TouchPhase.Began:
                    _touchStart = touch.position;
                    _isTracking = true;
                    break;
                case TouchPhase.Ended:
                    if (_isTracking)
                    {
                        EvaluateSwipe(touch.position - _touchStart);
                        _isTracking = false;
                    }
                    break;
                case TouchPhase.Canceled:
                    _isTracking = false;
                    break;
            }
        }

        /// <summary>키보드 폴백 처리(에디터/PC 테스트용).</summary>
        private void HandleKeyboard()
        {
            if (Input.GetKeyDown(KeyCode.LeftArrow) || Input.GetKeyDown(KeyCode.A))
                Emit(SwipeDirection.Left);
            else if (Input.GetKeyDown(KeyCode.RightArrow) || Input.GetKeyDown(KeyCode.D))
                Emit(SwipeDirection.Right);
            else if (Input.GetKeyDown(KeyCode.UpArrow) || Input.GetKeyDown(KeyCode.W) || Input.GetKeyDown(KeyCode.Space))
                Emit(SwipeDirection.Up);
            else if (Input.GetKeyDown(KeyCode.DownArrow) || Input.GetKeyDown(KeyCode.S))
                Emit(SwipeDirection.Down);
        }

        /// <summary>스와이프 벡터로부터 방향을 판정한다.</summary>
        private void EvaluateSwipe(Vector2 delta)
        {
            if (delta.magnitude < minSwipeDistance) return;

            // 수평/수직 중 더 큰 축으로 방향 결정.
            if (Mathf.Abs(delta.x) > Mathf.Abs(delta.y))
                Emit(delta.x > 0 ? SwipeDirection.Right : SwipeDirection.Left);
            else
                Emit(delta.y > 0 ? SwipeDirection.Up : SwipeDirection.Down);
        }

        private void Emit(SwipeDirection dir)
        {
            if (dir != SwipeDirection.None)
                OnSwipe?.Invoke(dir);
        }
    }
}
