import {
  validateScore,
  reasonableMaxScoreByDuration,
  MAX_ALLOWED_SPEED,
  DAILY_DONATION_POINT_CAP,
  ScorePayload,
} from "../src/validation";

/**
 * SPEC.md §6 점수 검증 규칙 테스트.
 * 점수 검증은 Unity 클라이언트 사전검증과 서버 finishRun 이 공유하는 핵심 계약이므로
 * 각 규칙과 경계값을 명시적으로 고정한다.
 */

/** floor(gameScore * 0.1) 로 올바른 donationPoints 를 만들어 유효 페이로드 구성 */
function validPayload(over: Partial<ScorePayload> = {}): ScorePayload {
  const gameScore = over.gameScore ?? 1000;
  return {
    durationSec: 60,
    distanceMeters: 500,
    gameScore,
    donationPoints: Math.floor(gameScore * 0.1),
    ...over,
  };
}

describe("상수", () => {
  it("MAX_ALLOWED_SPEED = 30 m/s", () => {
    expect(MAX_ALLOWED_SPEED).toBe(30);
  });
  it("DAILY_DONATION_POINT_CAP = 100,000P", () => {
    expect(DAILY_DONATION_POINT_CAP).toBe(100000);
  });
});

describe("reasonableMaxScoreByDuration", () => {
  it("durationSec * 30 * 5 + 5000 (버퍼)", () => {
    expect(reasonableMaxScoreByDuration(0)).toBe(5000);
    expect(reasonableMaxScoreByDuration(60)).toBe(60 * 30 * 5 + 5000);
  });
});

describe("validateScore - 정상 케이스", () => {
  it("유효한 페이로드는 ok=true", () => {
    expect(validateScore(validPayload())).toEqual({ ok: true });
  });

  it("donationPoints 는 내림(floor)을 따른다 (gameScore=12455 → 1245P)", () => {
    const p = validPayload({ gameScore: 12455, donationPoints: 1245 });
    expect(validateScore(p).ok).toBe(true);
  });

  it("0 거리/최소 시간도 공식만 맞으면 통과", () => {
    expect(validateScore(validPayload({ durationSec: 1, distanceMeters: 0, gameScore: 0, donationPoints: 0 })).ok).toBe(true);
  });
});

describe("validateScore - 기본 유효성", () => {
  it("durationSec <= 0 → duration_invalid", () => {
    expect(validateScore(validPayload({ durationSec: 0 }))).toMatchObject({ ok: false, reason: "duration_invalid" });
    expect(validateScore(validPayload({ durationSec: -5 })).reason).toBe("duration_invalid");
  });

  it("durationSec 가 유한수가 아니면 duration_invalid", () => {
    expect(validateScore(validPayload({ durationSec: NaN })).reason).toBe("duration_invalid");
    expect(validateScore(validPayload({ durationSec: Infinity })).reason).toBe("duration_invalid");
  });

  it("distanceMeters < 0 → distance_invalid", () => {
    expect(validateScore(validPayload({ distanceMeters: -1 })).reason).toBe("distance_invalid");
  });

  it("gameScore < 0 → score_invalid", () => {
    expect(validateScore(validPayload({ gameScore: -1, donationPoints: 0 })).reason).toBe("score_invalid");
  });

  it("donationPoints < 0 → points_invalid", () => {
    expect(validateScore(validPayload({ gameScore: 0, donationPoints: -1 })).reason).toBe("points_invalid");
  });
});

describe("validateScore - 공식/한계 검증", () => {
  it("donationPoints 가 floor(gameScore*0.1) 와 다르면 points_mismatch", () => {
    expect(validateScore(validPayload({ gameScore: 1000, donationPoints: 99 })).reason).toBe("points_mismatch");
    expect(validateScore(validPayload({ gameScore: 1000, donationPoints: 101 })).reason).toBe("points_mismatch");
  });

  it("distanceMeters > durationSec * 30 → speed_too_high", () => {
    // duration 10s → 최대 300m. 301m 은 불가.
    const p = validPayload({ durationSec: 10, distanceMeters: 301, gameScore: 100, donationPoints: 10 });
    expect(validateScore(p).reason).toBe("speed_too_high");
  });

  it("distanceMeters == durationSec * 30 (경계) 는 통과", () => {
    const p = validPayload({ durationSec: 10, distanceMeters: 300, gameScore: 300, donationPoints: 30 });
    expect(validateScore(p).ok).toBe(true);
  });

  it("gameScore > reasonableMax → score_too_high", () => {
    const duration = 10;
    const max = reasonableMaxScoreByDuration(duration); // 6500
    const gameScore = max + 10;
    const p = validPayload({ durationSec: duration, distanceMeters: 0, gameScore, donationPoints: Math.floor(gameScore * 0.1) });
    expect(validateScore(p).reason).toBe("score_too_high");
  });

  it("gameScore == reasonableMax (경계) 는 통과", () => {
    const duration = 10;
    const gameScore = reasonableMaxScoreByDuration(duration); // 6500
    const p = validPayload({ durationSec: duration, distanceMeters: 0, gameScore, donationPoints: Math.floor(gameScore * 0.1) });
    expect(validateScore(p).ok).toBe(true);
  });

  it("donationPoints > 100,000 상한 초과 → points_cap_exceeded", () => {
    // 상한만 단독 검증: duration 을 크게 잡아 reasonableMax 가 충분히 높도록 함.
    const duration = 7000;
    const gameScore = 1_000_010; // → donationPoints 100,001
    const p: ScorePayload = { durationSec: duration, distanceMeters: 0, gameScore, donationPoints: Math.floor(gameScore * 0.1) };
    expect(validateScore(p).reason).toBe("points_cap_exceeded");
  });

  it("donationPoints == 100,000 (경계) 는 통과", () => {
    const duration = 7000;
    const gameScore = 1_000_000; // → donationPoints 100,000 == cap
    const p: ScorePayload = { durationSec: duration, distanceMeters: 0, gameScore, donationPoints: Math.floor(gameScore * 0.1) };
    expect(validateScore(p).ok).toBe(true);
  });
});
