import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { MULTISIG_ABI } from '../abi/Multisig';

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
  throw new Error('Falta VITE_WALLETCONNECT_PROJECT_ID en el .env');
}

export const wagmiConfig = getDefaultConfig({
  appName: import.meta.env.VITE_APP_NAME ?? 'Multisig',
  projectId,
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(),
  },
});

export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`;

export { MULTISIG_ABI };
