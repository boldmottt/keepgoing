#!/usr/bin/env node
/**
 * set-admin-claim.js — 킵고잉 / KeepGoing 관리자 권한(custom claim) 부여 스크립트.
 *
 * 이메일로 사용자를 찾아 `{ admin: true }` 커스텀 클레임을 부여하거나(--remove 시 해제)
 * 합니다. 이 클레임은 Cloud Functions 의 requireAdmin() 게이트와 web 관리자 페이지,
 * Storage 규칙(request.auth.token.admin == true)에서 관리자 식별에 사용됩니다.
 *
 * 사용법:
 *   node scripts/set-admin-claim.js <email>            # admin 클레임 부여
 *   node scripts/set-admin-claim.js <email> --remove   # admin 클레임 해제
 *
 * 사전 준비 (서비스 계정 필요):
 *   1) Firebase 콘솔 > 프로젝트 설정 > 서비스 계정 > "새 비공개 키 생성" 으로
 *      서비스 계정 JSON 키를 내려받습니다. (이 파일은 절대 커밋하지 마세요.)
 *   2) 환경변수로 키 경로를 지정합니다:
 *        export GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/serviceAccount.json
 *   3) firebase-admin 설치 (둘 중 하나):
 *        npm --prefix scripts install      # scripts/package.json 사용
 *        npm install -g firebase-admin     # 전역 설치
 *
 * 주의:
 *   - 커스텀 클레임은 다음 토큰 갱신 시 반영됩니다. 대상 사용자는 재로그인하거나
 *     클라이언트에서 getIdToken(true) 로 토큰을 강제 갱신해야 즉시 적용됩니다.
 *   - Anonymous(익명) 계정에는 이메일이 없으므로 이 스크립트로 찾을 수 없습니다.
 *     관리자 계정은 이메일 기반(예: Google/이메일 로그인)으로 만들어 사용하세요.
 */

'use strict';

const admin = require('firebase-admin');

function parseArgs(argv) {
  const args = argv.slice(2);
  const remove = args.includes('--remove');
  const email = args.find((a) => !a.startsWith('--'));
  return { email, remove };
}

async function main() {
  const { email, remove } = parseArgs(process.argv);

  if (!email) {
    console.error('사용법: node scripts/set-admin-claim.js <email> [--remove]');
    process.exit(1);
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error(
      '오류: GOOGLE_APPLICATION_CREDENTIALS 환경변수가 설정되지 않았습니다.\n' +
        '서비스 계정 키 경로를 지정하세요:\n' +
        '  export GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/serviceAccount.json',
    );
    process.exit(1);
  }

  // GOOGLE_APPLICATION_CREDENTIALS 의 서비스 계정으로 Admin SDK 초기화.
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });

  const auth = admin.auth();

  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch (err) {
    console.error(`사용자를 찾을 수 없습니다 (email=${email}): ${err.message}`);
    process.exit(1);
  }

  // 기존 클레임을 보존하면서 admin 만 갱신/제거.
  const existing = user.customClaims || {};
  const nextClaims = { ...existing };

  if (remove) {
    delete nextClaims.admin;
  } else {
    nextClaims.admin = true;
  }

  await auth.setCustomUserClaims(user.uid, nextClaims);

  console.log(
    `완료: ${email} (uid=${user.uid}) 의 admin 클레임을 ` +
      `${remove ? '해제' : '부여'} 했습니다.`,
  );
  console.log('현재 커스텀 클레임:', JSON.stringify(nextClaims));
  console.log(
    '참고: 대상 사용자는 재로그인 또는 getIdToken(true) 로 토큰을 갱신해야 즉시 반영됩니다.',
  );
}

main().catch((err) => {
  console.error('실패:', err);
  process.exit(1);
});
