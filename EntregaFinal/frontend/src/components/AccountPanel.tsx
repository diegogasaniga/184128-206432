import { useEffect, useState } from 'react';
import { formatEther } from 'viem';
import { useAccount, useBalance, useEnsName, usePublicClient } from 'wagmi';
import { shortenAddress, formatToFixed } from '../lib/format';

export default function AccountPanel() {
  const { address, chainId, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId });
  const [blockNumber, setBlockNumber] = useState<bigint | null>(null);

  const { data: ensName } = useEnsName({
    address,
    chainId: 1,
    query: { enabled: Boolean(address) },
  });

  const { data: balanceData } = useBalance({
    address,
    query: { enabled: Boolean(address), refetchInterval: 10000 },
  });

  useEffect(() => {
    if (!publicClient || !isConnected) return;
    let mounted = true;
    const unwatch = publicClient.watchBlockNumber({
      onBlockNumber(block) {
        if (mounted) setBlockNumber(block);
      },
      emitOnBegin: true,
      poll: true,
      pollingInterval: 4000,
    });
    return () => {
      mounted = false;
      unwatch();
    };
  }, [publicClient, isConnected]);

  if (!isConnected || !address) return null;

  const displayName = ensName ?? shortenAddress(address);
  const ethBalance = balanceData ? formatToFixed(formatEther(balanceData.value)) : '0.0000';

  return (
    <section className="panel">
      <h2 className="panel-title">Panel de Cuenta</h2>
      <div className="info-row">
        <span className="info-label">Wallet</span>
        <span className="info-value">{displayName}</span>
      </div>
      <div className="info-row">
        <span className="info-label">Saldo ETH</span>
        <span className="info-value">{ethBalance} ETH</span>
      </div>
      <div className="info-row">
        <span className="info-label">Bloque actual</span>
        <span className="info-value">{blockNumber ? blockNumber.toString() : '…'}</span>
      </div>
    </section>
  );
}
