using UnityEngine;

namespace KeepGoing.Donation
{
    /// <summary>
    /// 기부 포인트 계산기.
    /// SPEC §2: donationPoints = floor(gameScore * 0.1)
    /// 포인트는 현금이 아니며, 클라이언트에서 계산한 값은 서버가 다시 검증한다(SPEC §6).
    /// </summary>
    public static class DonationPointCalculator
    {
        /// <summary>
        /// SPEC §8 필수 면책 문구. UI 결과 화면 등에 반드시 노출한다.
        /// (현금/인출/환전/1P=1원 표현 금지)
        /// </summary>
        public const string Disclaimer =
            "기부 포인트는 현금이 아니며, 유저에게 지급되거나 인출되지 않습니다. " +
            "기부 포인트는 회사 또는 후원사가 제공하는 시즌 기부금의 프로젝트별 배분 기준으로 사용됩니다. " +
            "실제 기부 내역은 시즌 종료 후 킵고잉 공식 홈페이지에 공개됩니다.";

        /// <summary>gameScore 로부터 기부 포인트를 계산한다.</summary>
        public static int Calculate(int gameScore)
        {
            if (gameScore <= 0) return 0;
            return Mathf.FloorToInt(gameScore * 0.1f);
        }
    }
}
