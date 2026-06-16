# web

Next.js 공개 기부 홈페이지 + 관리자 페이지 (App Router, TypeScript).

## 실행

```bash
cd web
cp .env.example .env.local   # 선택: Firebase 연동 시에만 값 채우기
npm install
npm run dev                  # 개발 서버
npm run build                # 정적 익스포트(out/) 생성
```

Firebase 환경변수가 비어 있으면 `lib/mockData.ts` 의 더미 데이터로 동작하므로
라이브 Firebase 프로젝트 없이도 모든 페이지가 렌더링됩니다.
`NEXT_PUBLIC_DATA_SOURCE=firebase` 와 설정값을 채우면 Firestore 에서 읽습니다.

## URL 구조

### 공개
```text
/                     소개 + 누적 현황 (안내 문구 포함)
/donations            시즌별 기부 현황
/seasons/[seasonId]   시즌 상세
/projects/[projectId] 프로젝트 상세
/leaderboard          공개 리더보드 (닉네임만)
/reports              실제 기부 내역 목록
/reports/[reportId]   실제 기부 내역 상세 (증빙/메모)
```

### 관리자 (admin custom claim 필요)
```text
/admin                로그인 게이트 + 탭형 대시보드
                      (시즌 / 프로젝트 / 후원 캠페인 / 특별 스테이지 / 기부 리포트 / 검수)
```

## 폴더 구조

```text
web/
  app/            App Router 페이지
  components/     공용 UI + admin/ 관리자 UI
  lib/
    firebase.ts   Firebase Web SDK 초기화 (env 기반)
    data.ts       데이터 접근 (mock 폴백, 소스 교체 가능)
    mockData.ts   seed-data.json 복사본 + 보강 더미
    format.ts     원/포인트 포맷 (1P=1원 표현 금지)
    functions.ts  Cloud Functions callable 래퍼 (이름으로 연결)
    adminAuth.ts  관리자 로그인 + admin claim 확인
    types.ts      공유 타입
    constants.ts  공용 문구/안내
```

## 문구 가이드 (SPEC §8)

- 사용: 기부 포인트 / 예상 기부액 / 시즌 기부금 풀 / 포인트 보내기 / 프로젝트 응원하기
- 금지: 캐시 / 현금 / 인출 / 환전 / 1포인트=1원 / 기부금 영수증 / 돈 벌기
