using UnityEngine;

namespace KeepGoing.Obstacles
{
    /// <summary>
    /// 낮게 깔린 가짜 배너 광고. 점프로 뛰어넘어야 한다.
    /// </summary>
    public class BannerObstacle : ObstacleBase
    {
        private static readonly string[] Parodies =
        {
            "바닥 배너 광고 (가짜)",
            "스크롤 멈춰! (패러디)",
            "발밑 쿠폰 (가짜)"
        };

        private string _label;

        public override string ParodyLabel
        {
            get
            {
                if (string.IsNullOrEmpty(_label))
                    _label = Parodies[Random.Range(0, Parodies.Length)];
                return _label;
            }
        }

        private void Awake()
        {
            avoidMethod = AvoidMethod.Jump; // 점프로 회피
        }
    }
}
