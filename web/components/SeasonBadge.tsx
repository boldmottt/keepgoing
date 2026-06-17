import { seasonStatusLabel } from '@/lib/format';
import type { SeasonStatus } from '@/lib/types';

export default function SeasonBadge({ status }: { status: SeasonStatus }) {
  const cls =
    status === 'donated' ? 'badge gold' : status === 'active' ? 'badge' : 'badge gray';
  return <span className={cls}>{seasonStatusLabel(status)}</span>;
}
