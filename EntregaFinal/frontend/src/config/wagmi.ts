import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { sepolia } from 'wagmi/chains';

const projectId = (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string) || 'placeholder';

export const wagmiConfig = getDefaultConfig({
  appName: (import.meta.env.VITE_APP_NAME as string) ?? 'Job Marketplace',
  projectId,
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(),
  },
});

export const MARKETPLACE_ADDRESS = (
  import.meta.env.VITE_JOB_MARKETPLACE_ADDRESS as `0x${string}`
) || undefined;

export const TOKEN_ADDRESS = (
  import.meta.env.VITE_TOKEN_ADDRESS as `0x${string}`
) || undefined;

export const DEPLOY_BLOCK = BigInt(
  parseInt(import.meta.env.VITE_DEPLOY_BLOCK ?? '0')
);

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

// Exported so MultisigPanel can read it from env without circular deps
export { };
