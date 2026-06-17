import { clampRunsLimit, toRunSummary } from "../src/profile";

/**
 * profile.ts 의 순수 헬퍼 테스트.
 * (Firestore 의존 callable 본체는 에뮬레이터 통합 테스트 영역)
 */

describe("clampRunsLimit", () => {
  it("미지정/잘못된 값은 기본 20", () => {
    expect(clampRunsLimit(undefined)).toBe(20);
    expect(clampRunsLimit(null)).toBe(20);
    expect(clampRunsLimit("abc")).toBe(20);
    expect(clampRunsLimit(0)).toBe(20);
    expect(clampRunsLimit(-5)).toBe(20);
    expect(clampRunsLimit(NaN)).toBe(20);
  });

  it("정상 값은 floor 적용", () => {
    expect(clampRunsLimit(10)).toBe(10);
    expect(clampRunsLimit(10.9)).toBe(10);
    expect(clampRunsLimit("15")).toBe(15);
  });

  it("최대 50으로 상한", () => {
    expect(clampRunsLimit(50)).toBe(50);
    expect(clampRunsLimit(999)).toBe(50);
  });
});

describe("toRunSummary", () => {
  it("Firestore 문서를 노출용 요약으로 변환 (Timestamp → millis)", () => {
    const summary = toRunSummary("run1", {
      uid: "secret-uid",
      gameScore: 12450,
      donationPoints: 1245,
      distanceMeters: 800,
      durationSec: 60,
      specialStageScore: 500,
      obstaclesDodged: 30,
      maxCombo: 25,
      specialStageEntered: true,
      selectedProjectId: "project-forest",
      validationStatus: "confirmed",
      clientVersion: "1.0.0",
      createdAt: { toMillis: () => 1718000000000 },
    });

    expect(summary).toEqual({
      runId: "run1",
      gameScore: 12450,
      donationPoints: 1245,
      distanceMeters: 800,
      durationSec: 60,
      specialStageScore: 500,
      obstaclesDodged: 30,
      maxCombo: 25,
      specialStageEntered: true,
      selectedProjectId: "project-forest",
      validationStatus: "confirmed",
      createdAtMillis: 1718000000000,
    });
    // uid/clientVersion 등 비노출 필드는 포함되지 않는다
    expect(Object.keys(summary)).not.toContain("uid");
    expect(Object.keys(summary)).not.toContain("clientVersion");
  });

  it("누락 필드는 안전 기본값으로 채운다", () => {
    const summary = toRunSummary("run2", {});
    expect(summary.gameScore).toBe(0);
    expect(summary.donationPoints).toBe(0);
    expect(summary.specialStageEntered).toBe(false);
    expect(summary.selectedProjectId).toBeNull();
    expect(summary.validationStatus).toBe("pending");
    expect(summary.createdAtMillis).toBeNull();
  });
});
