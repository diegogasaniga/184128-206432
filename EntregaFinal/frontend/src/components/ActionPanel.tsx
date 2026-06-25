import { useState } from 'react';
import { useWriteContract, useReadContract } from 'wagmi';
import { usePublicClient } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { keccak256, stringToHex } from 'viem';
import { MARKETPLACE_ADDRESS, TOKEN_ADDRESS, ZERO_ADDRESS } from '../config/wagmi';
import { JOB_MARKETPLACE_ABI, Job } from '../abi/JobMarketplace';
import { ERC20_ABI } from '../abi/ERC20';
import { uploadToIPFS, fetchFromIPFS, ipfsGatewayUrl, cacheCID, getCachedCID } from '../lib/ipfs';
import ErrorMessage from './ErrorMessage';

interface Props {
  jobId: bigint;
  job: Job;
  connectedAddress: `0x${string}`;
  isExpired: boolean;
  onSuccess: () => void;
}

function formatError(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const e = err as Record<string, unknown>;
    if (typeof e.shortMessage === 'string') return e.shortMessage;
    if (typeof e.message === 'string') return e.message;
  }
  return String(err);
}

function useContractWrite(onSuccess: () => void) {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function execute(args: Parameters<typeof writeContractAsync>[0]) {
    setError(null);
    setIsPending(true);
    try {
      const hash = await writeContractAsync(args);
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
      onSuccess();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setIsPending(false);
    }
  }

  return { execute, isPending, error };
}

// ── Assign Provider ───────────────────────────────────────────────────────────
function AssignProvider({ jobId, onSuccess }: { jobId: bigint; onSuccess: () => void }) {
  const [providerAddr, setProviderAddr] = useState('');
  const { execute, isPending, error } = useContractWrite(onSuccess);

  return (
    <div>
      <h3 className="panel-title">Asignar Proveedor</h3>
      <div className="form-group">
        <input className="form-input" placeholder="0x..." value={providerAddr} onChange={(e) => setProviderAddr(e.target.value)} />
      </div>
      {error && <ErrorMessage message={error} />}
      <button className="btn btn-primary" disabled={isPending || !providerAddr} onClick={() => execute({ address: MARKETPLACE_ADDRESS!, abi: JOB_MARKETPLACE_ABI, functionName: 'setProvider', args: [jobId, providerAddr as `0x${string}`] })}>
        {isPending ? 'Procesando…' : 'Asignar Proveedor'}
      </button>
    </div>
  );
}

// ── Fund Job ──────────────────────────────────────────────────────────────────
function FundJob({ jobId, budget, clientAddress, onSuccess }: { jobId: bigint; budget: bigint; clientAddress: `0x${string}`; onSuccess: () => void }) {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);
  const [step, setStep] = useState<'idle' | 'approving' | 'funding'>('idle');
  const [error, setError] = useState<string | null>(null);

  const { data: allowance } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [clientAddress, MARKETPLACE_ADDRESS!],
    query: { enabled: !!TOKEN_ADDRESS && !!MARKETPLACE_ADDRESS },
  });

  async function handleFund() {
    setError(null);
    setIsPending(true);
    try {
      if (!publicClient) throw new Error('Cliente no disponible');
      const currentAllowance = (allowance as bigint) ?? 0n;
      if (currentAllowance < budget) {
        setStep('approving');
        const approveHash = await writeContractAsync({ address: TOKEN_ADDRESS!, abi: ERC20_ABI, functionName: 'approve', args: [MARKETPLACE_ADDRESS!, budget] });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }
      setStep('funding');
      const fundHash = await writeContractAsync({ address: MARKETPLACE_ADDRESS!, abi: JOB_MARKETPLACE_ABI, functionName: 'fund', args: [jobId] });
      await publicClient.waitForTransactionReceipt({ hash: fundHash });
      await queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      onSuccess();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setIsPending(false);
      setStep('idle');
    }
  }

  const label = step === 'approving' ? 'Aprobando tokens…' : step === 'funding' ? 'Fondeando…' : 'Fondear Trabajo';

  return (
    <div>
      <h3 className="panel-title">Fondear Trabajo</h3>
      <p style={{ color: '#9ca3af', margin: '0 0 12px' }}>Budget: {(Number(budget) / 1e18).toLocaleString()} MKT</p>
      {error && <ErrorMessage message={error} />}
      <button className="btn btn-primary" disabled={isPending || !TOKEN_ADDRESS} onClick={handleFund}>{label}</button>
    </div>
  );
}

// ── Submit Deliverable via IPFS ───────────────────────────────────────────────
function SubmitDeliverable({ jobId, onSuccess }: { jobId: bigint; onSuccess: () => void }) {
  const [content, setContent] = useState('');
  const [step, setStep] = useState<'idle' | 'uploading' | 'submitting'>('idle');
  const [cid, setCid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  async function handleSubmit() {
    if (!content.trim()) return;
    setError(null);
    setStep('uploading');
    try {
      const uploadedCid = await uploadToIPFS(content);
      setCid(uploadedCid);
      cacheCID(jobId, uploadedCid);

      setStep('submitting');
      const deliverableRef = keccak256(stringToHex(uploadedCid));
      const hash = await writeContractAsync({ address: MARKETPLACE_ADDRESS!, abi: JOB_MARKETPLACE_ABI, functionName: 'submit', args: [jobId, deliverableRef] });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
      onSuccess();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setStep('idle');
    }
  }

  return (
    <div>
      <h3 className="panel-title">Enviar Entrega via IPFS</h3>
      <div className="form-group">
        <label>Descripción de la entrega</label>
        <textarea className="form-input" rows={4} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Describí el trabajo entregado, links, referencias…" />
      </div>
      {cid && (
        <div className="ipfs-info">
          <span>CID: <code>{cid}</code></span>
          <a href={ipfsGatewayUrl(cid)} target="_blank" rel="noopener noreferrer" className="ipfs-link">Ver en IPFS ↗</a>
        </div>
      )}
      {error && <ErrorMessage message={error} />}
      <button className="btn btn-primary" disabled={step !== 'idle' || !content.trim()} onClick={handleSubmit}>
        {step === 'uploading' ? 'Subiendo a IPFS…' : step === 'submitting' ? 'Enviando a contrato…' : 'Enviar Entrega'}
      </button>
      {!import.meta.env.VITE_PINATA_JWT && (
        <p style={{ color: '#f87171', fontSize: '0.8rem', marginTop: 8 }}>VITE_PINATA_JWT no configurado — IPFS upload no disponible</p>
      )}
    </div>
  );
}

// ── Evaluator Actions ─────────────────────────────────────────────────────────
function EvaluatorActions({ jobId, onSuccess }: { jobId: bigint; onSuccess: () => void }) {
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [manualCid, setManualCid] = useState(getCachedCID(jobId) ?? '');
  const [deliverableContent, setDeliverableContent] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  const { execute: executeComplete, isPending: completePending, error: completeError } = useContractWrite(onSuccess);
  const { execute: executeReject, isPending: rejectPending, error: rejectError } = useContractWrite(onSuccess);

  async function handleFetch() {
    if (!manualCid.trim()) return;
    setFetchError(null);
    setIsFetching(true);
    try {
      const text = await fetchFromIPFS(manualCid.trim());
      setDeliverableContent(text);
      cacheCID(jobId, manualCid.trim());
    } catch (err) {
      setFetchError(formatError(err));
    } finally {
      setIsFetching(false);
    }
  }

  return (
    <div>
      <h3 className="panel-title">Revisión del Evaluador</h3>

      <div className="form-group">
        <label>CID de IPFS (proveído por el proveedor)</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="form-input" value={manualCid} onChange={(e) => setManualCid(e.target.value)} placeholder="Qm..." style={{ flex: 1 }} />
          <button className="btn btn-secondary" disabled={isFetching || !manualCid.trim()} onClick={handleFetch}>
            {isFetching ? 'Cargando…' : 'Ver entrega'}
          </button>
        </div>
        {manualCid && <a href={ipfsGatewayUrl(manualCid)} target="_blank" rel="noopener noreferrer" className="ipfs-link" style={{ marginTop: 4, display: 'inline-block' }}>Abrir en IPFS ↗</a>}
      </div>

      {fetchError && <ErrorMessage message={fetchError} />}

      {deliverableContent && (
        <div style={{ background: '#111827', borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: '0 0 6px' }}>CONTENIDO DE LA ENTREGA</p>
          <p style={{ color: '#e5e7eb', margin: 0, whiteSpace: 'pre-wrap' }}>{deliverableContent}</p>
        </div>
      )}

      <div className="proposal-actions">
        {completeError && <ErrorMessage message={completeError} />}
        <button className="btn btn-success" disabled={completePending} onClick={() => executeComplete({ address: MARKETPLACE_ADDRESS!, abi: JOB_MARKETPLACE_ABI, functionName: 'complete', args: [jobId, keccak256(stringToHex('approved'))] })}>
          {completePending ? 'Procesando…' : 'Aprobar'}
        </button>
        <button className="btn btn-danger" disabled={rejectPending} onClick={() => setShowReject(!showReject)}>Rechazar</button>
      </div>

      {showReject && (
        <div style={{ marginTop: 12 }}>
          <div className="form-group">
            <label>Motivo de rechazo</label>
            <input className="form-input" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Describí el motivo…" />
          </div>
          {rejectError && <ErrorMessage message={rejectError} />}
          <button className="btn btn-danger" disabled={rejectPending} onClick={() => executeReject({ address: MARKETPLACE_ADDRESS!, abi: JOB_MARKETPLACE_ABI, functionName: 'reject', args: [jobId, keccak256(stringToHex(rejectReason || 'rejected'))] })}>
            {rejectPending ? 'Procesando…' : 'Confirmar Rechazo'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Claim Refund ──────────────────────────────────────────────────────────────
function ClaimRefund({ jobId, onSuccess }: { jobId: bigint; onSuccess: () => void }) {
  const { execute, isPending, error } = useContractWrite(onSuccess);
  return (
    <div>
      <h3 className="panel-title">Reclamar Reembolso</h3>
      <p style={{ color: '#9ca3af', margin: '0 0 12px' }}>El trabajo expiró. Los fondos pueden ser reembolsados al cliente.</p>
      {error && <ErrorMessage message={error} />}
      <button className="btn btn-execute" disabled={isPending} onClick={() => execute({ address: MARKETPLACE_ADDRESS!, abi: JOB_MARKETPLACE_ABI, functionName: 'claimRefund', args: [jobId] })}>
        {isPending ? 'Procesando…' : 'Reclamar Reembolso'}
      </button>
    </div>
  );
}

// ── Client Reject (Open) ──────────────────────────────────────────────────────
function ClientReject({ jobId, onSuccess }: { jobId: bigint; onSuccess: () => void }) {
  const { execute, isPending, error } = useContractWrite(onSuccess);
  return (
    <div style={{ marginTop: 12 }}>
      <h3 className="panel-title">Rechazar Trabajo</h3>
      {error && <ErrorMessage message={error} />}
      <button className="btn btn-danger" disabled={isPending} onClick={() => execute({ address: MARKETPLACE_ADDRESS!, abi: JOB_MARKETPLACE_ABI, functionName: 'reject', args: [jobId, keccak256(stringToHex('rejected'))] })}>
        {isPending ? 'Procesando…' : 'Rechazar'}
      </button>
    </div>
  );
}

// ── Main ActionPanel ──────────────────────────────────────────────────────────
export default function ActionPanel({ jobId, job, connectedAddress, isExpired, onSuccess }: Props) {
  const addr = connectedAddress.toLowerCase();
  const isClient = job.client.toLowerCase() === addr;
  const isProvider = job.provider.toLowerCase() === addr && job.provider !== ZERO_ADDRESS;
  const isEvaluator = job.evaluator.toLowerCase() === addr;
  const status = Number(job.status);

  const panels: React.ReactNode[] = [];

  if (isExpired && (status === 1 || status === 2)) {
    panels.push(<ClaimRefund key="refund" jobId={jobId} onSuccess={onSuccess} />);
  }

  if (status === 0 && isClient) {
    if (job.provider === ZERO_ADDRESS) {
      panels.push(<AssignProvider key="assign" jobId={jobId} onSuccess={onSuccess} />);
    }
    panels.push(<FundJob key="fund" jobId={jobId} budget={job.budget} clientAddress={connectedAddress} onSuccess={onSuccess} />);
    panels.push(<ClientReject key="reject" jobId={jobId} onSuccess={onSuccess} />);
  }

  if (status === 1 && isProvider) {
    panels.push(<SubmitDeliverable key="submit" jobId={jobId} onSuccess={onSuccess} />);
  }

  if (status === 2 && isEvaluator) {
    panels.push(<EvaluatorActions key="evaluate" jobId={jobId} onSuccess={onSuccess} />);
  }

  if (panels.length === 0) return null;

  return (
    <div className="panel">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>{panels}</div>
    </div>
  );
}
