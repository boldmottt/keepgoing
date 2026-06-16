/**
 * 점수 검증 규칙 (SPEC.md §6 - MVP)
 *
 * durationSec > 0
 * distanceMeters >= 0
 * gameScore >= 0
 * donationPoints === floor(gameScore * 0.1)
 * distanceMeters <= durationSec * maxAllowedSpeed   (maxAllowedSpeed = 30 m/s)
 * gameScore <= reasonableMaxScoreByDuration
 * donationPoints <= dailyDonationPointCap           (= 100,000P)
 */

/** 최대 허용 속도 (m/s) */
export const MAX_ALLOWED_SPEED = 30;

/** 일일 기부 포인트 상한 */
export const DAILY_DONATION_POINT_CAP = 100000;

/**
 * durationSec 기반 합리적 최대 점수.
 *
 * 근거: gameScore 는 거리(distanceMeters * 1)와 장애물/콤보/특별스테이지 보너스의 합.
 * 거리만으로도 durationSec * MAX_ALLOWED_SPEED 까지 가능하고,
 * 장애물 회피/콤보/특별 스테이지 점수가 거리 점수의 수 배까지 더해질 수 있으므로
 * 거리 점수 상한의 5배 + 고정 버퍼(짧은 런의 변동성 흡수)로 잡는다.
 */
export function reasonableMaxScoreByDuration(durationSec: number): number {
  const BUFFER = 5000;
  return durationSec * MAX_ALLOWED_SPEED * 5 + BUFFER;
}

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

export interface ScorePayload {
  durationSec: number;
  distanceMeters: number;
  gameScore: number;
  donationPoints: number;
}

/**
 * 점수 페이로드를 검증한다.
 * 실패 시 ok=false 와 사유(reason)를 반환한다.
 */
export function validateScore(p: ScorePayload): ValidationResult {
  const { durationSec, distanceMeters, gameScore, donationPoints } = p;

  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    return { ok: false, reason: "duration_invalid" };
  }
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) {
    return { ok: false, reason: "distance_invalid" };
  }
  if (!Number.isFinite(gameScore) || gameScore < 0) {
    return { ok: false, reason: "score_invalid" };
  }
  if (!Number.isFinite(donationPoints) || donationPoints < 0) {
    return { ok: false, reason: "points_invalid" };
  }
  // 기부 포인트는 게임 점수의 10% (내림) 와 정확히 일치해야 함
  if (donationPoints !== Math.floor(gameScore * 0.1)) {
    return { ok: false, reason: "points_mismatch" };
  }
  // 물리적으로 불가능한 이동 거리
  if (distanceMeters > durationSec * MAX_ALLOWED_SPEED) {
    return { ok: false, reason: "speed_too_high" };
  }
  // 시간 대비 비현실적으로 높은 점수
  if (gameScore > reasonableMaxScoreByDuration(durationSec)) {
    return { ok: false, reason: "score_too_high" };
  }
  // 일일 기부 포인트 상한 초과
  if (donationPoints > DAILY_DONATION_POINT_CAP) {
    return { ok: false, reason: "points_cap_exceeded" };
  }

  return { ok: true };
}
