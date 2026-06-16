using UnityEngine;

namespace KeepGoing.Obstacles
{
    /// <summary>
    /// 위쪽에 매달린 가짜 팝업 광고. 슬라이드로 아래를 지나가야 한다.
    /// </summary>
    public class PopupObstacle : ObstacleBase
    {
        private static readonly string[] Parodies =
        {
            "전면 팝업 광고 (가짜)",
            "X를 눌러 닫기 (패러디)",
            "지금 설치! (가짜)"
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
            avoidMethod = AvoidMethod.Slide; // 슬라이드로 회피
        }
    }
}
