import { STATUS_LABELS } from '../abi/JobMarketplace';

const STATUS_CLASSES: Record<number, string> = {
  0: 'status-open',
  1: 'status-funded',
  2: 'status-submitted',
  3: 'status-completed',
  4: 'status-rejected',
  5: 'status-expired',
};

export default function StatusBadge({ status }: { status: number }) {
  return (
    <span className={`status-badge ${STATUS_CLASSES[status] ?? ''}`}>
      {STATUS_LABELS[status] ?? 'Unknown'}
    </span>
  );
}
