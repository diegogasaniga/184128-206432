import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { MULTISIG_ABI } from '../abi/Multisig';

const projectId = (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string) || 'placeholder';

export const wagmiConfig = getDefaultConfig({
  appName: (import.meta.env.VITE_APP_NAME as string) ?? 'Multisig',
  projectId,
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(),
  },
});

export const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`) || undefined;

export { MULTISIG_ABI };
