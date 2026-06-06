import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { parseAbiItem, parseEventLogs } from 'viem';
import { MARKETPLACE_ADDRESS, ZERO_ADDRESS } from '../config/wagmi';
import { JOB_MARKETPLACE_ABI } from '../abi/JobMarketplace';
import ErrorMessage from '../components/ErrorMessage';

export default function CreateJobPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const publicClient = usePublicClient();

  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [evaluator, setEvaluator] = useState('');
  const [provider, setProvider] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const { writeContractAsync, isPending } = useWriteContract();
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const [txError, setTxError] = useState<string | null>(null);

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const isLoading = isPending || isConfirming;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTxError(null);

    if (!MARKETPLACE_ADDRESS) return;

    const budgetWei = BigInt(Math.round(parseFloat(budget) * 1e18));
    const expiryTimestamp = BigInt(Math.floor(new Date(expiresAt).getTime() / 1000));
    const providerAddr = provider.trim() as `0x${string}`;

    try {
      const txHash = await writeContractAsync({
        address: MARKETPLACE_ADDRESS,
        abi: JOB_MARKETPLACE_ABI,
        functionName: 'createJob',
        args: [description, budgetWei, evaluator as `0x${string}`, providerAddr, expiryTimestamp],
      });
      setHash(txHash);

      if (!publicClient) return;
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      const logs = parseEventLogs({
        abi: JOB_MARKETPLACE_ABI,
        logs: receipt.logs,
        eventName: 'JobCreated',
      });

      await queryClient.invalidateQueries({ queryKey: ['jobs'] });

      const jobId = logs[0]?.args.jobId;
      if (jobId !== undefined) {
        navigate(`/jobs/${jobId}`);
      } else {
        navigate('/');
      }
    } catch (err: unknown) {
      setTxError(formatError(err));
    }
  }

  return (
    <div>
      <h2>Publicar Trabajo</h2>

      {!MARKETPLACE_ADDRESS && (
        <div className="warning-banner">
          VITE_JOB_MARKETPLACE_ADDRESS no está configurado.
        </div>
      )}

      <div className="panel" style={{ maxWidth: 560 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Descripción *</label>
            <textarea
              className="form-input"
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describí el trabajo..."
            />
          </div>

          <div className="form-group">
            <label>Budget (en tokens MKT) *</label>
            <input
              className="form-input"
              type="number"
              step="0.0001"
              min="0"
              required
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="ej: 100"
            />
          </div>

          <div className="form-group">
            <label>Dirección del Evaluador * (puede ser el Multisig)</label>
            <input
              className="form-input"
              type="text"
              required
              value={evaluator}
              onChange={(e) => setEvaluator(e.target.value)}
              placeholder="0x..."
            />
          </div>

          <div className="form-group">
            <label>Dirección del Proveedor *</label>
            <input
              className="form-input"
              type="text"
              required
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="0x..."
            />
          </div>

          <div className="form-group">
            <label>Fecha de Expiración *</label>
            <input
              className="form-input"
              type="datetime-local"
              required
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
            />
          </div>

          {txError && <ErrorMessage message={txError} />}

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={isLoading || !MARKETPLACE_ADDRESS}>
              {isPending ? 'Confirmá en tu billetera…' : isConfirming ? 'Confirmando…' : 'Crear Trabajo'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/')}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatError(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const e = err as Record<string, unknown>;
    if (typeof e.shortMessage === 'string') return e.shortMessage;
    if (typeof e.message === 'string') return e.message;
  }
  return String(err);
}
