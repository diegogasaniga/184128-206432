import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { sepolia } from 'wagmi/chains';

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
  throw new Error('Falta VITE_WALLETCONNECT_PROJECT_ID en el .env');
}

export const config = getDefaultConfig({
  appName: import.meta.env.VITE_APP_NAME || 'wallet-panel',
  projectId,
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(),
  },
});