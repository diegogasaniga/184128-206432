import { useQuery } from '@tanstack/react-query';
import { usePublicClient, useReadContract } from 'wagmi';
import { parseAbiItem } from 'viem';
import { Link } from 'react-router-dom';
import { MARKETPLACE_ADDRESS, DEPLOY_BLOCK } from '../config/wagmi';
import { JOB_MARKETPLACE_ABI } from '../abi/JobMarketplace';
import StatusBadge from '../components/StatusBadge';
import AccountPanel from '../components/AccountPanel';
import TokensPanel from '../components/TokensPanel';
import MultisigPanel from '../components/MultisigPanel';

interface JobSummary {
  jobId: bigint;
  client: string;
  description: string;
  budget: bigint;
}

function formatEther(wei: bigint): string {
  return (Number(wei) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function JobCard({ job }: { job: JobSummary }) {
  const { data: jobData } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: JOB_MARKETPLACE_ABI,
    functionName: 'getJob',
    args: [job.jobId],
    query: { enabled: !!MARKETPLACE_ADDRESS },
  });

  return (
    <Link to={`/jobs/${job.jobId}`} className="job-card" style={{ textDecoration: 'none' }}>
      <div className="job-card-header">
        <span className="job-id">#{job.jobId.toString()}</span>
        {jobData && <StatusBadge status={Number(jobData.status)} />}
      </div>
      <p className="job-description">{job.description}</p>
      <div className="job-meta">
        <span className="job-budget">{formatEther(job.budget)} MKT</span>
        <span className="job-client" title={job.client}>{job.client.slice(0, 6)}…{job.client.slice(-4)}</span>
      </div>
    </Link>
  );
}

function JobsSection() {
  const publicClient = usePublicClient();

  const { data: jobs, isLoading, error, refetch } = useQuery({
    queryKey: ['jobs', MARKETPLACE_ADDRESS],
    queryFn: async (): Promise<JobSummary[]> => {
      if (!publicClient || !MARKETPLACE_ADDRESS) return [];
      const logs = await publicClient.getLogs({
        address: MARKETPLACE_ADDRESS,
        event: parseAbiItem(
          'event JobCreated(uint256 indexed jobId, address indexed client, address indexed evaluator, address provider, string description, uint256 budget, uint256 expiresAt)'
        ),
        fromBlock: DEPLOY_BLOCK,
        toBlock: 'latest',
      });
      return logs.map((log) => ({
        jobId: log.args.jobId ?? 0n,
        client: log.args.client ?? '',
        description: log.args.description ?? '',
        budget: log.args.budget ?? 0n,
      }));
    },
    enabled: !!publicClient && !!MARKETPLACE_ADDRESS,
  });

  if (!MARKETPLACE_ADDRESS) {
    return <div className="warning-banner">VITE_JOB_MARKETPLACE_ADDRESS no configurado. Desplegá el contrato y actualizá el .env.</div>;
  }

  return (
    <section>
      <div className="page-header">
        <h2 style={{ margin: 0 }}>Trabajos</h2>
        <Link to="/create" className="btn btn-primary">+ Publicar Trabajo</Link>
      </div>

      {isLoading && <p className="loading">Cargando trabajos…</p>}
      {error && (
        <div className="warning-banner">
          {(error as Error).message.includes('10,000') || (error as Error).message.includes('range')
            ? <>El RPC no permite consultar más de 10 000 bloques a la vez. Actualizá <code>VITE_DEPLOY_BLOCK</code> en el <code>.env</code> con el bloque real del deploy para reducir el rango.</>
            : <>No se pudieron cargar los trabajos. Verificá tu conexión o intentá de nuevo.</>
          }
          <button className="btn btn-primary" onClick={() => refetch()} style={{ marginLeft: 12 }}>Reintentar</button>
        </div>
      )}
      {!isLoading && !error && jobs?.length === 0 && (
        <div className="empty-state">
          <p>No hay trabajos publicados todavía.</p>
          <Link to="/create" className="btn btn-primary">Publicar el primero</Link>
        </div>
      )}

      <div className="jobs-grid">
        {jobs?.map((job) => <JobCard key={job.jobId.toString()} job={job} />)}
      </div>
    </section>
  );
}

export default function JobsPage() {
  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* ── Entrega 1: Account + Tokens ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <AccountPanel />
        <TokensPanel />
      </div>

      {/* ── Entrega 2: Multisig panel (visible si VITE_MULTISIG_ADDRESS está configurado) ── */}
      <MultisigPanel />

      {/* ── Marketplace ── */}
      <JobsSection />
    </div>
  );
}
