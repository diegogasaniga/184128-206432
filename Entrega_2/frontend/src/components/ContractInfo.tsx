import { useReadContract } from 'wagmi';
import { CONTRACT_ADDRESS, MULTISIG_ABI } from '../config/wagmi';

export default function ContractInfo() {
  const enabled = !!CONTRACT_ADDRESS;

  const { data: signersRaw } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: MULTISIG_ABI,
    functionName: 'getSigners',
    query: { enabled },
  });

  const { data: thresholdRaw } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: MULTISIG_ABI,
    functionName: 'threshold',
    query: { enabled },
  });

  const signers = signersRaw as readonly `0x${string}`[] | undefined;
  const threshold = thresholdRaw as bigint | undefined;

  return (
    <div className="panel">
      <h2>Información del Contrato</h2>

      <div className="info-row">
        <span className="info-label">Dirección del contrato</span>
        <span className="info-value">{CONTRACT_ADDRESS}</span>
      </div>

      <div className="info-row">
        <span className="info-label">Threshold</span>
        <span className="info-value">
          {threshold != null ? `${threshold.toString()} de ${signers?.length ?? '?'} aprobaciones` : '—'}
        </span>
      </div>

      <div className="info-row">
        <span className="info-label">Signers ({signers?.length ?? 0})</span>
        <div className="signer-list">
          {signers?.map((addr) => (
            <span key={addr} className="signer-address">{addr}</span>
          )) ?? <span className="info-value">—</span>}
        </div>
      </div>
    </div>
  );
}
