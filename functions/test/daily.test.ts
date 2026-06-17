import {
  startOfKstDayMillis,
  aggregateDailyPoints,
  topN,
} from "../src/daily";

/** 오늘의 리더보드 순수 헬퍼 테스트. */

describe("startOfKstDayMillis", () => {
  const KST = 9 * 60 * 60 * 1000;

  it("KST 오전(=UTC 전날 오후)의 하루 시작은 KST 자정", () => {
    // 2026-06-17 02:00 UTC == 2026-06-17 11:00 KST
    const now = Date.UTC(2026, 5, 17, 2, 0, 0);
    // 기대: 2026-06-17 00:00 KST == 2026-06-16 15:00 UTC
    const expected = Date.UTC(2026, 5, 16, 15, 0, 0);
    expect(startOfKstDayMillis(now)).toBe(expected);
  });

  it("정확히 KST 자정이면 그 시각이 시작", () => {
    const midnightKst = Date.UTC(2026, 5, 16, 15, 0, 0); // 2026-06-17 00:00 KST
    expect(startOfKstDayMillis(midnightKst)).toBe(midnightKst);
  });

  it("KST 자정 1초 전은 전날 시작으로", () => {
    const justBefore = Date.UTC(2026, 5, 16, 14, 59, 59); // 2026-06-16 23:59:59 KST
    const expected = Date.UTC(2026, 5, 15, 15, 0, 0); // 2026-06-16 00:00 KST
    expect(startOfKstDayMillis(justBefore)).toBe(expected);
  });

  it("반환값은 항상 KST 자정(=UTC 15:00 경계)", () => {
    const start = startOfKstDayMillis(Date.now());
    expect((start + KST) % (24 * 60 * 60 * 1000)).toBe(0);
  });
});

describe("aggregateDailyPoints", () => {
  it("유저별 donationPoints 합산", () => {
    const totals = aggregateDailyPoints([
      { uid: "a", donationPoints: 100 },
      { uid: "b", donationPoints: 50 },
      { uid: "a", donationPoints: 30 },
    ]);
    expect(totals.get("a")).toBe(130);
    expect(totals.get("b")).toBe(50);
  });

  it("uid 누락 행은 무시, 비수치는 0 처리", () => {
    const totals = aggregateDailyPoints([
      { uid: "", donationPoints: 999 },
      { uid: "a", donationPoints: NaN as unknown as number },
      { uid: "a", donationPoints: 20 },
    ]);
    expect(totals.has("")).toBe(false);
    expect(totals.get("a")).toBe(20);
  });
});

describe("topN", () => {
  const totals = new Map<string, number>([
    ["a", 300],
    ["b", 500],
    ["c", 100],
    ["d", 400],
  ]);

  it("포인트 내림차순 상위 N", () => {
    const top = topN(totals, new Set(), 2);
    expect(top).toEqual([
      { uid: "b", points: 500 },
      { uid: "d", points: 400 },
    ]);
  });

  it("제외 유저는 빠짐", () => {
    const top = topN(totals, new Set(["b"]), 2);
    expect(top.map((t) => t.uid)).toEqual(["d", "a"]);
  });
});
