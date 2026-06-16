using UnityEngine;

namespace KeepGoing.Obstacles
{
    /// <summary>
    /// 가짜 광고판 장애물. 한 레인을 막고 서 있으며 레인을 바꿔서 피해야 한다.
    /// 패러디 문구만 노출하며 실제 브랜드와 무관하다.
    /// </summary>
    public class BillboardObstacle : ObstacleBase
    {
        // 가짜/패러디 광고 문구 풀.
        private static readonly string[] Parodies =
        {
            "메가버거 1+1 (가짜)",
            "초특가 세일 (패러디)",
            "지금 클릭! (가짜광고)",
            "당첨되셨습니다 (가짜)"
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
            avoidMethod = AvoidMethod.ChangeLane; // 레인 변경으로 회피
        }
    }
}
