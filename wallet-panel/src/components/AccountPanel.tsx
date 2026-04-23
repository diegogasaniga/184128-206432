import { useEffect, useState } from 'react';
import { formatEther } from 'viem';
import { useAccount, useBalance, useEnsName, usePublicClient } from 'wagmi';

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatToFourDecimals(value: string): string {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return '0.0000';
  }

  return (Math.floor(numericValue * 10000) / 10000).toFixed(4);
}

export default function AccountPanel() {
  const { address, chainId, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId });
  const [blockNumber, setBlockNumber] = useState<bigint | null>(null);

  const { data: ensName } = useEnsName({
    address,
    chainId: 1,
    query: {
      enabled: Boolean(address),
    },
  });

  const { data: balanceData } = useBalance({
    address,
    query: {
      enabled: Boolean(address),
      refetchInterval: 10000,
    },
  });

  useEffect(() => {
    if (!publicClient || !isConnected) {
      return;
    }

    let mounted = true;

    const unwatch = publicClient.watchBlockNumber({
      onBlockNumber(block) {
        if (mounted) {
          setBlockNumber(block);
        }
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

  if (!isConnected || !address) {
    return null;
  }

  const displayName = ensName || shortenAddress(address);
  const ethBalance = balanceData ? formatToFourDecimals(formatEther(balanceData.value)) : '0.0000';

  return (
    <section className="panel">
      <h2>Panel de Cuenta</h2>

      <div className="info-row">
        <strong>Wallet:</strong> <span>{displayName}</span>
      </div>

      <div className="info-row">
        <strong>Saldo ETH:</strong> <span>{ethBalance} ETH</span>
      </div>

      <div className="info-row">
        <strong>Bloque actual:</strong>{' '}
        <span>{blockNumber ? blockNumber.toString() : 'Cargando...'}</span>
      </div>
    </section>
  );
}