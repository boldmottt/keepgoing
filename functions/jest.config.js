/** Jest 설정 — ts-jest 로 TypeScript 테스트 실행 (test/ 디렉터리만 대상). */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/test/**/*.test.ts"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.test.json" }],
  },
};
