# web

Next.js 공개 기부 홈페이지 + 관리자 페이지.

- 공개 홈페이지: `feature/web-public` 브랜치
- 관리자 페이지: `feature/web-admin` 브랜치

## URL 구조 (공개)

```text
/                     소개 + 누적 현황
/donations            기부 현황
/seasons/[seasonId]   시즌 상세
/projects/[projectId] 프로젝트 상세
/leaderboard          공개 리더보드
/reports/[reportId]   실제 기부 내역
/admin                관리자 (admin claim 필요)
```
