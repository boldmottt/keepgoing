#!/usr/bin/env bash
#
# deploy.sh — 킵고잉 / KeepGoing 전체 배포 오케스트레이션.
#
# 단계:
#   1) functions 빌드 (npm ci && npm run build → lib/)
#   2) web 빌드      (npm ci && npm run build → out/ 정적 익스포트)
#   3) firebase deploy (functions / firestore:rules / firestore:indexes / storage / hosting)
#
# 사전 준비:
#   - firebase-tools 설치 + 로그인:  npm install -g firebase-tools && firebase login
#   - .firebaserc 의 프로젝트 id 설정 또는  firebase use <project-id>
#   - web/.env.local 작성 (NEXT_PUBLIC_* / NEXT_PUBLIC_DATA_SOURCE=firestore)
#   - 자세한 내용은 docs/DEPLOY.md 참고.
#
# 사용법 (저장소 루트에서 실행):
#   bash scripts/deploy.sh
#   ./scripts/deploy.sh

set -euo pipefail

# 이 스크립트가 어디서 실행되든 저장소 루트로 이동 (firebase.json 위치).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

echo "==> 저장소 루트: ${ROOT_DIR}"

if ! command -v firebase >/dev/null 2>&1; then
  echo "오류: firebase CLI 가 설치되어 있지 않습니다." >&2
  echo "      npm install -g firebase-tools && firebase login" >&2
  exit 1
fi

echo "==> [1/3] Cloud Functions 빌드"
( cd functions && npm ci && npm run build )

echo "==> [2/3] 웹 정적 빌드 (Next.js export → web/out)"
( cd web && npm ci && npm run build )

echo "==> [3/3] Firebase 배포 (functions, firestore:rules, firestore:indexes, storage, hosting)"
firebase deploy --only functions,firestore:rules,firestore:indexes,storage,hosting

echo "==> 배포 완료."
echo "    다음 단계: seedFirestore 호출로 더미 데이터 주입, set-admin-claim.js 로 관리자 지정 (docs/DEPLOY.md)."
