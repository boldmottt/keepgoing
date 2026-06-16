// 표시 포맷 헬퍼.
// 중요: 포인트는 절대 통화로 렌더링하지 않는다 (1P=1원 표현 금지).
// 통화는 "원", 포인트는 "P" 로 명확히 구분한다.

const numberFormatter = new Intl.NumberFormat('ko-KR');

/** 금액(원) 포맷. 예: 1000000 -> "1,000,000원" */
export function formatCurrency(amount: number): string {
  return `${numberFormatter.format(Math.round(amount))}원`;
}

/** 기부 포인트 포맷. 예: 1850000 -> "1,850,000P" */
export function formatPoints(points: number): string {
  return `${numberFormatter.format(Math.round(points))}P`;
}

/** 숫자(콤마) 포맷. 단위 없음. 플레이 수/유저 수 등. */
export function formatNumber(value: number): string {
  return numberFormatter.format(Math.round(value));
}

/** 비율(0~1)을 퍼센트 문자열로. 예: 0.4973 -> "49.7%" */
export function formatPercent(ratio: number, digits = 1): string {
  if (!isFinite(ratio) || ratio <= 0) return '0%';
  return `${(ratio * 100).toFixed(digits)}%`;
}

/** ISO 날짜를 YYYY.MM.DD 로. */
export function formatDate(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

/** 시즌 종료까지 남은 일수. 음수면 0. */
export function daysUntil(iso: string): number {
  if (!iso) return 0;
  const end = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

/** 시즌 상태 한글 라벨. */
export function seasonStatusLabel(status: string): string {
  switch (status) {
    case 'draft':
      return '준비 중';
    case 'active':
      return '진행 중';
    case 'closed':
      return '종료 (배분 대기)';
    case 'donated':
      return '기부 완료';
    default:
      return status;
  }
}
