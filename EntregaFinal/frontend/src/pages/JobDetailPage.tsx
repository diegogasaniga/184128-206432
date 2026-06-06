import { useParams, Link } from 'react-router-dom';
import { useReadContract, useAccount } from 'wagmi';
import { MARKETPLACE_ADDRESS, ZERO_ADDRESS } from '../config/wagmi';
import { JOB_MARKETPLACE_ABI, STATUS_LABELS, Job } from '../abi/JobMarketplace';
import StatusBadge from '../components/StatusBadge';
import ActionPanel from '../components/ActionPanel';

function formatEther(wei: bigint): string {
  const eth = Number(wei) / 1e18;
  return eth.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function formatDate(timestamp: bigint): string {
  return new Date(Number(timestamp) * 1000).toLocaleString();
}

function AddressRow({ label, address }: { label: string; address: string }) {
  const isZero = address === ZERO_ADDRESS;
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value" style={{ color: isZero ? '#6b7280' : undefined }}>
        {isZero ? 'No asignado' : address}
      </span>
    </div>
  );
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const jobId = BigInt(id ?? '0');
  const { address } = useAccount();

  const {
    data: jobData,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: JOB_MARKETPLACE_ABI,
    functionName: 'getJob',
    args: [jobId],
    query: { enabled: !!MARKETPLACE_ADDRESS },
  });

  if (!MARKETPLACE_ADDRESS) {
    return (
      <div className="warning-banner">
        VITE_JOB_MARKETPLACE_ADDRESS no está configurado.
      </div>
    );
  }

  if (isLoading) return <p className="loading">Cargando trabajo…</p>;

  if (error || !jobData) {
    return (
      <div className="warning-banner">
        Error al cargar el trabajo.{' '}
        <button className="btn btn-primary" onClick={() => refetch()}>
          Reintentar
        </button>
      </div>
    );
  }

  const job = jobData as unknown as Job;
  const status = Number(job.status);
  const now = BigInt(Math.floor(Date.now() / 1000));
  const isExpired = now > job.expiresAt;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Link to="/" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.9rem' }}>
          ← Volver al tablero
        </Link>
      </div>

      <div className="job-detail-header">
        <h2 style={{ margin: 0 }}>Trabajo #{id}</h2>
        <StatusBadge status={status} />
      </div>

      <div style={{ display: 'grid', gap: 20, marginTop: 20 }}>
        <div className="panel">
          <h3 className="panel-title">Descripción</h3>
          <p style={{ margin: 0, color: '#e5e7eb', lineHeight: 1.6 }}>{job.description}</p>
        </div>

        <div className="panel">
          <h3 className="panel-title">Detalles</h3>

          <div className="info-row">
            <span className="info-label">Estado</span>
            <span className="info-value">{STATUS_LABELS[status]}</span>
          </div>

          <div className="info-row">
            <span className="info-label">Budget</span>
            <span className="info-value">{formatEther(job.budget)} MKT</span>
          </div>

          <div className="info-row">
            <span className="info-label">Expira</span>
            <span className="info-value" style={{ color: isExpired ? '#f87171' : undefined }}>
              {formatDate(job.expiresAt)} {isExpired && '(Expirado)'}
            </span>
          </div>

          <AddressRow label="Cliente" address={job.client} />
          <AddressRow label="Evaluador" address={job.evaluator} />
          <AddressRow label="Proveedor" address={job.provider} />

          {job.deliverableRef !== '0x0000000000000000000000000000000000000000000000000000000000000000' && (
            <div className="info-row">
              <span className="info-label">Deliverable Ref</span>
              <span className="info-value" style={{ wordBreak: 'break-all' }}>
                {job.deliverableRef}
              </span>
            </div>
          )}
        </div>

        {address && (
          <ActionPanel
            jobId={jobId}
            job={job}
            connectedAddress={address}
            isExpired={isExpired}
            onSuccess={() => refetch()}
          />
        )}
      </div>
    </div>
  );
}
