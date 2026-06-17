import {
  clampLimit,
  normalizeUserStatus,
  actionToTargetStatus,
  computeReviewAdjustment,
  participantCountDelta,
} from "../src/review";

/** 관리자 검수 순수 헬퍼 테스트. */

describe("clampLimit", () => {
  it("기본 50, 잘못된 값 보정", () => {
    expect(clampLimit(undefined)).toBe(50);
    expect(clampLimit(0)).toBe(50);
    expect(clampLimit("x")).toBe(50);
  });
  it("정상값 floor, 최대 200", () => {
    expect(clampLimit(10.7)).toBe(10);
    expect(clampLimit(9999)).toBe(200);
  });
});

describe("normalizeUserStatus", () => {
  it("허용 상태만 통과", () => {
    expect(normalizeUserStatus("active")).toBe("active");
    expect(normalizeUserStatus("banned")).toBe("banned");
    expect(normalizeUserStatus("suspicious")).toBe("suspicious");
  });
  it("그 외는 null", () => {
    expect(normalizeUserStatus("deleted")).toBeNull();
    expect(normalizeUserStatus(undefined)).toBeNull();
    expect(normalizeUserStatus(123)).toBeNull();
  });
});

describe("actionToTargetStatus", () => {
  it("confirm/reject 매핑, 그 외 null", () => {
    expect(actionToTargetStatus("confirm")).toBe("confirmed");
    expect(actionToTargetStatus("reject")).toBe("rejected");
    expect(actionToTargetStatus("nope")).toBeNull();
  });
});

describe("computeReviewAdjustment", () => {
  it("rejected → confirmed: +points 확정", () => {
    expect(computeReviewAdjustment("rejected", "confirmed", 100)).toEqual({
      changed: true,
      pointsDelta: 100,
      direction: "confirm",
      targetStatus: "confirmed",
    });
  });

  it("pending → confirmed: +points 확정", () => {
    expect(computeReviewAdjustment("pending", "confirmed", 70).pointsDelta).toBe(70);
  });

  it("confirmed → rejected: -points 확정취소", () => {
    expect(computeReviewAdjustment("confirmed", "rejected", 100)).toEqual({
      changed: true,
      pointsDelta: -100,
      direction: "unconfirm",
      targetStatus: "rejected",
    });
  });

  it("pending → rejected: 집계 변화 없음(미반영이었음)", () => {
    expect(computeReviewAdjustment("pending", "rejected", 100)).toEqual({
      changed: true,
      pointsDelta: 0,
      direction: "none",
      targetStatus: "rejected",
    });
  });

  it("동일 상태는 변화 없음", () => {
    expect(computeReviewAdjustment("confirmed", "confirmed", 100).changed).toBe(false);
    expect(computeReviewAdjustment("rejected", "rejected", 100).changed).toBe(false);
  });
});

describe("participantCountDelta", () => {
  it("confirm: 다른 확정 기여 없으면 +1, 있으면 0", () => {
    expect(participantCountDelta("confirm", false)).toBe(1);
    expect(participantCountDelta("confirm", true)).toBe(0);
  });
  it("unconfirm: 다른 확정 기여 없으면 -1, 있으면 0", () => {
    expect(participantCountDelta("unconfirm", false)).toBe(-1);
    expect(participantCountDelta("unconfirm", true)).toBe(0);
  });
  it("none: 변화 없음", () => {
    expect(participantCountDelta("none", false)).toBe(0);
  });
});
