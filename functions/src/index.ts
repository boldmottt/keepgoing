/**
 * 킵고잉 / KeepGoing - Cloud Functions 엔트리 포인트.
 * 모든 callable 함수를 여기서 export 한다.
 * (firebase-functions v2, nodejs22)
 */
import { setGlobalOptions } from "firebase-functions/v2";

// 리전/리소스 전역 설정
setGlobalOptions({ region: "asia-northeast3", maxInstances: 10 });

// 시즌
export { getActiveSeason } from "./seasons";

// 사용자 프로필
export { setNickname, setDefaultDonationProject } from "./auth";
export { getUserProfile, getMyRuns } from "./profile";

// 런(게임 기록)
export { startRun, finishRun } from "./runs";

// 리더보드
export { getSeasonLeaderboard, getProjectLeaderboard } from "./leaderboards";
export { getDailyLeaderboard } from "./daily";

// 관리자
export {
  createSeason,
  updateSeason,
  createProject,
  updateProject,
  createSponsorCampaign,
  updateSponsorCampaign,
  upsertSpecialStage,
  createDonationReport,
  closeSeasonAndDistribute,
} from "./admin";

// 관리자 검수 (SPEC §17)
export {
  listSuspiciousUsers,
  listRejectedRuns,
  setUserStatus,
  reviewRun,
} from "./review";

// 시드
export { seedFirestore } from "./seed";
