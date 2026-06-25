import { useCallback, useEffect, useState } from 'react';
import {
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from 'wagmi';
import { formatEther, isAddress, parseEther } from 'viem';
import { MULTISIG_ABI } from '../abi/Multisig';

const MULTISIG_ADDRESS = import.meta.env.VITE_MULTISIG_ADDRESS as `0x${string}` | undefined;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

// ── Contract Info ─────────────────────────────────────────────────────────────

function ContractInfo() {
  const enabled = !!MULTISIG_ADDRESS;

  const { data: signers } = useReadContract({
    address: MULTISIG_ADDRESS,
    abi: MULTISIG_ABI,
    functionName: 'getSigners',
    query: { enabled },
  });

  const { data: threshold } = useReadContract({
    address: MULTISIG_ADDRESS,
    abi: MULTISIG_ABI,
    functionName: 'threshold',
    query: { enabled },
  });

  const signersArr = signers as readonly `0x${string}`[] | undefined;
  const thresholdVal = threshold as bigint | undefined;

  return (
    <div style={{ marginBottom: 16 }}>
      <div className="info-row">
        <span className="info-label">Contrato Multisig</span>
        <span className="info-value">{MULTISIG_ADDRESS}</span>
      </div>
      <div className="info-row">
        <span className="info-label">Threshold</span>
        <span className="info-value">
          {thresholdVal != null
            ? `${thresholdVal.toString()} de ${signersArr?.length ?? '?'} firmas`
            : '—'}
        </span>
      </div>
      <div className="info-row">
        <span className="info-label">Signers</span>
        <div className="signer-list">
          {signersArr?.map((addr) => (
            <span key={addr} className="signer-address">{addr}</span>
          )) ?? <span className="info-value">—</span>}
        </div>
      </div>
    </div>
  );
}

// ── New Proposal Form ─────────────────────────────────────────────────────────

function NewProposalForm() {
  const [to, setTo] = useState('');
  const [value, setValue] = useState('0');
  const [data, setData] = useState('');
  const [validationError, setValidationError] = useState('');

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isSuccess, isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    if (!isAddress(to)) { setValidationError('Dirección destino inválida.'); return; }
    const hexData = data.trim() === '' ? '0x' : data.trim();
    if (!/^0x[0-9a-fA-F]*$/.test(hexData)) { setValidationError('Calldata debe ser hex válido.'); return; }
    writeContract({
      address: MULTISIG_ADDRESS!,
      abi: MULTISIG_ABI,
      functionName: 'propose',
      args: [to as `0x${string}`, parseEther(value || '0'), hexData as `0x${string}`],
    });
  };

  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #374151' }}>
      <h3 className="panel-title">Nueva Propuesta</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Dirección destino</label>
          <input className="form-input" type="text" placeholder="0x..." value={to} onChange={(e) => setTo(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Valor (ETH)</label>
          <input className="form-input" type="number" min="0" step="any" placeholder="0" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Calldata (hex, opcional)</label>
          <input className="form-input" type="text" placeholder="0x" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        {validationError && <p className="tx-status error">{validationError}</p>}
        <button type="submit" className="btn btn-primary" disabled={isPending || isConfirming}>
          {isPending ? 'Confirmá en wallet…' : isConfirming ? 'Esperando bloque…' : 'Proponer'}
        </button>
        {isSuccess && <p className="tx-status success">Propuesta creada.</p>}
        {error && <p className="tx-status error">{error.message.split('\n')[0]}</p>}
      </form>
    </div>
  );
}

// ── Proposal Card ─────────────────────────────────────────────────────────────

type ProposalData = {
  id: number;
  proposer: `0x${string}`;
  to: `0x${string}`;
  value: bigint;
  data: `0x${string}`;
  approvalCount: bigint;
  executed: boolean;
  cancelled: boolean;
};

function ProposalCard({ proposal, threshold, isSigner, onAction }: {
  proposal: ProposalData;
  threshold: bigint;
  isSigner: boolean;
  onAction: () => void;
}) {
  const { address } = useAccount();
  const isPending = !proposal.executed && !proposal.cancelled;
  const isProposer = address?.toLowerCase() === proposal.proposer.toLowerCase();

  const { data: userHasApproved } = useReadContract({
    address: MULTISIG_ADDRESS,
    abi: MULTISIG_ABI,
    functionName: 'hasApproved',
    args: [BigInt(proposal.id), address ?? ZERO_ADDRESS],
    query: { enabled: !!address },
  });

  const canApprove = isSigner && isPending && !userHasApproved;
  const canExecute = isSigner && isPending && proposal.approvalCount >= threshold;
  const canCancel = isPending && isProposer;

  const { writeContract, data: hash, isPending: txPending, error } = useWriteContract();
  const { isSuccess, isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  useEffect(() => { if (isSuccess) onAction(); }, [isSuccess, onAction]);

  const isBusy = txPending || isConfirming;
  const short = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

  const badgeClass = proposal.executed ? 'status-completed' : proposal.cancelled ? 'status-rejected' : 'status-open';
  const badgeLabel = proposal.executed ? 'Ejecutada' : proposal.cancelled ? 'Cancelada' : 'Pendiente';

  return (
    <div className="proposal-card">
      <div className="proposal-header">
        <span className="proposal-id">Propuesta #{proposal.id}</span>
        <span className={`status-badge ${badgeClass}`}>{badgeLabel}</span>
      </div>
      <div className="proposal-field">Destino: <span>{short(proposal.to)}</span></div>
      <div className="proposal-field">Valor: <span>{formatEther(proposal.value)} ETH</span></div>
      {proposal.data !== '0x' && (
        <div className="proposal-field">Calldata: <span>{proposal.data.slice(0, 18)}…</span></div>
      )}
      <div className="proposal-field">Proponente: <span>{short(proposal.proposer)}</span></div>
      <div className="proposal-approvals">
        Aprobaciones: <span className="approval-count">{proposal.approvalCount.toString()} / {threshold.toString()}</span>
      </div>
      {isPending && (
        <div className="proposal-actions">
          {canApprove && <button className="btn btn-success" disabled={isBusy} onClick={() => writeContract({ address: MULTISIG_ADDRESS!, abi: MULTISIG_ABI, functionName: 'approve', args: [BigInt(proposal.id)] })}>Aprobar</button>}
          {canExecute && <button className="btn btn-execute" disabled={isBusy} onClick={() => writeContract({ address: MULTISIG_ADDRESS!, abi: MULTISIG_ABI, functionName: 'execute', args: [BigInt(proposal.id)] })}>Ejecutar</button>}
          {canCancel && <button className="btn btn-danger" disabled={isBusy} onClick={() => writeContract({ address: MULTISIG_ADDRESS!, abi: MULTISIG_ABI, functionName: 'cancel', args: [BigInt(proposal.id)] })}>Cancelar</button>}
        </div>
      )}
      {isBusy && <p className="tx-status">Procesando…</p>}
      {error && <p className="tx-status error">{error.message.split('\n')[0]}</p>}
    </div>
  );
}

// ── Proposal List ─────────────────────────────────────────────────────────────

function ProposalList({ isSigner }: { isSigner: boolean }) {
  const enabled = !!MULTISIG_ADDRESS;

  const { data: thresholdRaw } = useReadContract({ address: MULTISIG_ADDRESS, abi: MULTISIG_ABI, functionName: 'threshold', query: { enabled, refetchInterval: 5000 } });
  const { data: proposalCount, refetch: refetchCount } = useReadContract({ address: MULTISIG_ADDRESS, abi: MULTISIG_ABI, functionName: 'getProposalCount', query: { enabled, refetchInterval: 5000 } });

  const threshold = (thresholdRaw as bigint | undefined) ?? 1n;
  const count = Number((proposalCount as bigint | undefined) ?? 0n);

  type RawProposal = readonly [`0x${string}`, `0x${string}`, bigint, `0x${string}`, bigint, boolean, boolean];

  const { data: proposalResults, refetch: refetchProposals } = useReadContracts({
    contracts: Array.from({ length: count }, (_, i) => ({
      address: MULTISIG_ADDRESS,
      abi: MULTISIG_ABI,
      functionName: 'getProposal' as const,
      args: [BigInt(i)] as const,
    })),
    query: { enabled: count > 0, refetchInterval: 5000 },
  });

  const refetch = useCallback(() => { void refetchCount(); void refetchProposals(); }, [refetchCount, refetchProposals]);

  const proposals: ProposalData[] = ((proposalResults ?? []) as { status: string; result?: unknown }[])
    .map((entry, i) => {
      if (entry.status !== 'success' || !entry.result) return null;
      const [proposer, to, value, data, approvalCount, executed, cancelled] = entry.result as RawProposal;
      return { id: i, proposer, to, value, data, approvalCount, executed, cancelled };
    })
    .filter((p): p is ProposalData => p !== null);

  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #374151' }}>
      <h3 className="panel-title">Propuestas ({proposals.length})</h3>
      {proposals.length === 0
        ? <p className="proposals-empty">No hay propuestas todavía.</p>
        : [...proposals].reverse().map((p) => (
            <ProposalCard key={p.id} proposal={p} threshold={threshold} isSigner={isSigner} onAction={refetch} />
          ))}
    </div>
  );
}

// ── Main MultisigPanel ────────────────────────────────────────────────────────

export default function MultisigPanel() {
  const { address } = useAccount();

  const { data: isSigner } = useReadContract({
    address: MULTISIG_ADDRESS,
    abi: MULTISIG_ABI,
    functionName: 'isSigner',
    args: [address ?? ZERO_ADDRESS],
    query: { enabled: !!address && !!MULTISIG_ADDRESS },
  });

  if (!MULTISIG_ADDRESS) return null;

  return (
    <section className="panel">
      <h2 className="panel-title">Multisig</h2>
      <ContractInfo />
      {!!isSigner && <NewProposalForm />}
      <ProposalList isSigner={!!isSigner} />
    </section>
  );
}
