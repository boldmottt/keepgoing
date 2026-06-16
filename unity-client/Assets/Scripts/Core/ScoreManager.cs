using System;
using UnityEngine;

namespace KeepGoing.Core
{
    /// <summary>
    /// SPEC §2 점수 공식을 "정확히" 구현하는 점수 매니저.
    /// gameScore = distanceMeters*1 + obstaclesDodged*10 + comboBonus + nearMissBonus + specialStageScore
    /// donationPoints 계산은 DonationPointCalculator 에서 수행한다(중복 방지).
    /// MonoBehaviour 가 아니어도 동작하도록 순수 C# 클래스로 작성하되,
    /// GameManager 가 인스턴스를 들고 다닌다.
    /// </summary>
    public class ScoreManager
    {
        // ---- 일반 스테이지 누적 값 ----
        public float DistanceMeters { get; private set; }      // 달린 거리 (m)
        public int ObstaclesDodged { get; private set; }       // 회피한 장애물 수
        public int NearMissBonus { get; private set; }         // 아슬아슬 회피 보너스(누적 점수)
        public int MaxCombo { get; private set; }              // 최고 콤보
        public int CurrentCombo { get; private set; }          // 현재 콤보

        // ---- 특별(브랜드) 스테이지 수집 값 ----
        public int NormalBrandItems { get; private set; }      // 일반 브랜드 아이템(코인)
        public int BigBrandItems { get; private set; }         // 큰 브랜드 아이템(광고판)
        public int HeartItems { get; private set; }            // 하트 아이템
        public int GoldenItems { get; private set; }           // 골든 아이템
        public int CollectionComboBonus { get; private set; }  // 수집 콤보 보너스(누적 점수)

        /// <summary>모든 값 초기화 (런 시작 시 호출).</summary>
        public void Reset()
        {
            DistanceMeters = 0f;
            ObstaclesDodged = 0;
            NearMissBonus = 0;
            MaxCombo = 0;
            CurrentCombo = 0;
            NormalBrandItems = 0;
            BigBrandItems = 0;
            HeartItems = 0;
            GoldenItems = 0;
            CollectionComboBonus = 0;
        }

        /// <summary>거리 누적. 프레임마다 (speed * deltaTime) 만큼 더한다.</summary>
        public void AddDistance(float meters)
        {
            if (meters > 0f) DistanceMeters += meters;
        }

        /// <summary>장애물을 성공적으로 회피했을 때 호출. 콤보도 1 증가시킨다.</summary>
        public void OnObstacleDodged()
        {
            ObstaclesDodged++;
            CurrentCombo++;
            if (CurrentCombo > MaxCombo) MaxCombo = CurrentCombo;
        }

        /// <summary>장애물에 충돌 등으로 콤보가 끊겼을 때.</summary>
        public void ResetCombo()
        {
            CurrentCombo = 0;
        }

        /// <summary>아슬아슬 회피 보너스 추가.</summary>
        public void AddNearMiss(int bonus = 5)
        {
            if (bonus > 0) NearMissBonus += bonus;
        }

        // ---- 특별 스테이지 수집 ----
        public void CollectNormalBrand() { NormalBrandItems++; }
        public void CollectBigBrand() { BigBrandItems++; }
        public void CollectHeart() { HeartItems++; }
        public void CollectGolden() { GoldenItems++; }
        public void AddCollectionCombo(int bonus)
        {
            if (bonus > 0) CollectionComboBonus += bonus;
        }

        /// <summary>
        /// SPEC §2: comboBonus 는 최고 콤보에 따른 "구간 누적" 보너스.
        /// 10콤보=100, 20콤보=250(누적), 30콤보=500(누적).
        /// 예) maxCombo=30 이면 100+250+500 = 850.
        /// </summary>
        public int ComboBonus
        {
            get
            {
                int bonus = 0;
                if (MaxCombo >= 10) bonus += 100;
                if (MaxCombo >= 20) bonus += 250;
                if (MaxCombo >= 30) bonus += 500;
                return bonus;
            }
        }

        /// <summary>
        /// SPEC §2: specialStageScore =
        ///   normalBrandItems*20 + bigBrandItems*100 + heartItems*150 + goldenItems*500 + collectionComboBonus
        /// </summary>
        public int SpecialStageScore
        {
            get
            {
                return NormalBrandItems * 20
                     + BigBrandItems * 100
                     + HeartItems * 150
                     + GoldenItems * 500
                     + CollectionComboBonus;
            }
        }

        /// <summary>일반 스테이지에서 얻은 점수(특별 스테이지 제외). 서버 검증용 normalStageScore.</summary>
        public int NormalStageScore
        {
            get
            {
                return Mathf.FloorToInt(DistanceMeters) * 1
                     + ObstaclesDodged * 10
                     + ComboBonus
                     + NearMissBonus;
            }
        }

        /// <summary>
        /// SPEC §2: 최종 게임 점수.
        /// distanceMeters 는 정수 점수로 환산(거리 1m = 1점)한다.
        /// </summary>
        public int GameScore
        {
            get { return NormalStageScore + SpecialStageScore; }
        }
    }
}
