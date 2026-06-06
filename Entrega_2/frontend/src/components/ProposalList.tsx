import { useCallback } from 'react';
import { useReadContract, useReadContracts } from 'wagmi';
import { CONTRACT_ADDRESS, MULTISIG_ABI } from '../config/wagmi';
import ProposalCard, { type ProposalData } from './ProposalCard';

type Props = { isSigner: boolean };

type RawProposal = readonly [`0x${string}`, `0x${string}`, bigint, `0x${string}`, bigint, boolean, boolean];

export default function ProposalList({ isSigner }: Props) {
  const enabled = !!CONTRACT_ADDRESS;

  const { data: thresholdRaw } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: MULTISIG_ABI,
    functionName: 'threshold',
    query: { enabled, refetchInterval: 5000 },
  });
  const threshold = thresholdRaw as bigint | undefined;

  const { data: proposalCount, refetch: refetchCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: MULTISIG_ABI,
    functionName: 'getProposalCount',
    query: { enabled, refetchInterval: 5000 },
  });

  const count = Number(proposalCount ?? 0n);

  const { data: proposalResults, refetch: refetchProposals } = useReadContracts({
    contracts: Array.from({ length: count }, (_, i) => ({
      address: CONTRACT_ADDRESS,
      abi: MULTISIG_ABI,
      functionName: 'getProposal' as const,
      args: [BigInt(i)] as const,
    })),
    query: { enabled: count > 0, refetchInterval: 5000 },
  });

  const refetch = useCallback(() => {
    void refetchCount();
    void refetchProposals();
  }, [refetchCount, refetchProposals]);

  const proposals: ProposalData[] = (proposalResults ?? [])
    .map((entry, i) => {
      if (entry.status !== 'success' || !entry.result) return null;
      const [proposer, to, value, data, approvalCount, executed, cancelled] = entry.result as RawProposal;
      return { id: i, proposer, to, value, data, approvalCount, executed, cancelled };
    })
    .filter((p): p is ProposalData => p !== null);

  return (
    <div className="panel">
      <h2>Propuestas ({proposals.length})</h2>

      {proposals.length === 0 ? (
        <p className="proposals-empty">No hay propuestas todavía.</p>
      ) : (
        [...proposals].reverse().map((p) => (
          <ProposalCard
            key={p.id}
            proposal={p}
            threshold={threshold ?? 1n}
            isSigner={isSigner}
            onAction={refetch}
          />
        ))
      )}
    </div>
  );
}
