import { useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { CONTRACT_ADDRESS, MULTISIG_ABI } from '../config/wagmi';

export type ProposalData = {
  id: number;
  proposer: `0x${string}`;
  to: `0x${string}`;
  value: bigint;
  data: `0x${string}`;
  approvalCount: bigint;
  executed: boolean;
  cancelled: boolean;
};

type Props = {
  proposal: ProposalData;
  threshold: bigint;
  isSigner: boolean;
  onAction: () => void;
};

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

function StatusBadge({ executed, cancelled }: { executed: boolean; cancelled: boolean }) {
  if (executed) return <span className="status-badge status-executed">Ejecutada</span>;
  if (cancelled) return <span className="status-badge status-cancelled">Cancelada</span>;
  return <span className="status-badge status-pending">Pendiente</span>;
}

function ActionButton({
  label,
  className,
  disabled,
  onClick,
}: {
  label: string;
  className: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`btn ${className}`} disabled={disabled} onClick={onClick}>
      {label}
    </button>
  );
}

export default function ProposalCard({ proposal, threshold, isSigner, onAction }: Props) {
  const { address } = useAccount();
  const isPending = !proposal.executed && !proposal.cancelled;
  const isProposer = address?.toLowerCase() === proposal.proposer.toLowerCase();

  const { data: userHasApproved } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: MULTISIG_ABI,
    functionName: 'hasApproved',
    args: [BigInt(proposal.id), address ?? ZERO_ADDRESS],
    query: { enabled: !!address },
  });

  const canApprove = isSigner && isPending && !userHasApproved;
  const canExecute = isSigner && isPending && proposal.approvalCount >= threshold;
  const canCancel = isPending && isProposer;

  // Single shared write hook — action determined by which button was pressed
  const { writeContract, data: hash, isPending: txPending, error } = useWriteContract();
  const { isSuccess, isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) onAction();
  }, [isSuccess, onAction]);

  const isBusy = txPending || isConfirming;

  const handleApprove = () =>
    writeContract({ address: CONTRACT_ADDRESS, abi: MULTISIG_ABI, functionName: 'approve', args: [BigInt(proposal.id)] });

  const handleExecute = () =>
    writeContract({ address: CONTRACT_ADDRESS, abi: MULTISIG_ABI, functionName: 'execute', args: [BigInt(proposal.id)] });

  const handleCancel = () =>
    writeContract({ address: CONTRACT_ADDRESS, abi: MULTISIG_ABI, functionName: 'cancel', args: [BigInt(proposal.id)] });

  const shortAddr = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

  return (
    <div className="proposal-card">
      <div className="proposal-header">
        <span className="proposal-id">Propuesta #{proposal.id}</span>
        <StatusBadge executed={proposal.executed} cancelled={proposal.cancelled} />
      </div>

      <div className="proposal-field">
        Destino: <span>{shortAddr(proposal.to)}</span>
      </div>
      <div className="proposal-field">
        Valor: <span>{formatEther(proposal.value)} ETH</span>
      </div>
      {proposal.data !== '0x' && (
        <div className="proposal-field">
          Calldata: <span>{proposal.data.slice(0, 18)}…</span>
        </div>
      )}
      <div className="proposal-field">
        Proponente: <span>{shortAddr(proposal.proposer)}</span>
      </div>

      <div className="proposal-approvals">
        Aprobaciones:{' '}
        <span className="approval-count">
          {proposal.approvalCount.toString()} / {threshold.toString()}
        </span>
      </div>

      {isPending && (
        <div className="proposal-actions">
          <ActionButton
            label="Aprobar"
            className="btn-success"
            disabled={!canApprove || isBusy}
            onClick={handleApprove}
          />
          <ActionButton
            label="Ejecutar"
            className="btn-execute"
            disabled={!canExecute || isBusy}
            onClick={handleExecute}
          />
          {canCancel && (
            <ActionButton
              label="Cancelar"
              className="btn-danger"
              disabled={isBusy}
              onClick={handleCancel}
            />
          )}
        </div>
      )}

      {isBusy && <p className="tx-status">Procesando transacción…</p>}
      {error && <p className="tx-status error">{error.message.split('\n')[0]}</p>}
    </div>
  );
}
