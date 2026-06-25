import { formatUnits, parseAbi } from 'viem';
import { useAccount, useReadContracts } from 'wagmi';

type Props = { address: `0x${string}`; fallbackLabel: string };

const erc20Abi = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address owner) view returns (uint256)',
]);

function formatBalance(value: string): string {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(4) : '0.0000';
}

export default function TokenCard({ address, fallbackLabel }: Props) {
  const { address: walletAddress, isConnected } = useAccount();

  const { data, isLoading, isError } = useReadContracts({
    allowFailure: false,
    contracts: isConnected && walletAddress
      ? [
          { address, abi: erc20Abi, functionName: 'name' },
          { address, abi: erc20Abi, functionName: 'symbol' },
          { address, abi: erc20Abi, functionName: 'decimals' },
          { address, abi: erc20Abi, functionName: 'balanceOf', args: [walletAddress] },
        ]
      : [],
    query: { enabled: Boolean(walletAddress), refetchInterval: 10000 },
  });

  if (!isConnected || !walletAddress) {
    return <article className="token-card"><h3>{fallbackLabel}</h3><p>Conectá wallet</p></article>;
  }
  if (isLoading) {
    return <article className="token-card"><h3>{fallbackLabel}</h3><p>Cargando…</p></article>;
  }
  if (isError || !data || data.length !== 4) {
    return <article className="token-card"><h3>{fallbackLabel}</h3><p>Error al leer token</p></article>;
  }

  const [name, symbol, decimals, balance] = data as [string, string, number, bigint];
  const formattedBalance = formatBalance(formatUnits(balance, decimals));

  return (
    <article className="token-card">
      <h3>{name || fallbackLabel}</h3>
      <div className="token-balance">{formattedBalance} <span>{symbol}</span></div>
      <div className="token-address" title={address}>{address.slice(0, 10)}…</div>
    </article>
  );
}
