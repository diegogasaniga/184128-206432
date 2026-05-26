import { formatUnits, parseAbi } from 'viem';
import { useAccount, useReadContracts } from 'wagmi';

type TokenCardProps = {
  address: `0x${string}`;
  fallbackLabel: string;
};

const erc20Abi = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address owner) view returns (uint256)',
]);

function formatToFourDecimals(value: string): string {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return '0.0000';
  }

  return numericValue.toFixed(4);
}

export default function TokenCard({
  address,
  fallbackLabel,
}: TokenCardProps) {
  const { address: walletAddress, isConnected } = useAccount();

  const { data, isLoading, isError } = useReadContracts({
    allowFailure: false,
    contracts:
      isConnected && walletAddress
        ? [
            {
              address,
              abi: erc20Abi,
              functionName: 'name',
            },
            {
              address,
              abi: erc20Abi,
              functionName: 'symbol',
            },
            {
              address,
              abi: erc20Abi,
              functionName: 'decimals',
            },
            {
              address,
              abi: erc20Abi,
              functionName: 'balanceOf',
              args: [walletAddress],
            },
          ]
        : [],
    query: {
      enabled: Boolean(walletAddress),
      refetchInterval: 10000,
    },
  });

  if (!isConnected || !walletAddress) {
    return (
      <article className="token-card">
        <h3>{fallbackLabel}</h3>
        <p>Conectá una wallet para ver el saldo.</p>
      </article>
    );
  }

  if (isLoading) {
    return (
      <article className="token-card">
        <h3>{fallbackLabel}</h3>
        <p>Cargando token...</p>
      </article>
    );
  }

  if (isError || !data || data.length !== 4) {
    return (
      <article className="token-card">
        <h3>{fallbackLabel}</h3>
        <p>No se pudo leer la información del token.</p>
      </article>
    );
  }

  const [name, symbol, decimals, balance] = data as [string, string, number, bigint];
  const formattedBalance = formatToFourDecimals(formatUnits(balance, decimals));

  return (
    <article className="token-card">
      <h3>{name || fallbackLabel}</h3>

      <div>
        <strong>Símbolo:</strong> {symbol}
      </div>

      <div>
        <strong>Contrato:</strong> {address}
      </div>

      <div>
        <strong>Saldo:</strong> {formattedBalance} {symbol}
      </div>
    </article>
  );
}