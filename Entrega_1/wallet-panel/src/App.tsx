import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import AccountPanel from './components/AccountPanel';
import TokensPanel from './components/TokensPanel';

export default function App() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <main className="app">
        <div className="connect-box">
          <h1>Wallet Panel</h1>
          <ConnectButton />
        </div>
      </main>
    );
  }

  return (
    <main className="app">
      <header className="header">
        <h1>Wallet Panel</h1>
        <ConnectButton />
      </header>

      <div className="content">
        <AccountPanel />
        <TokensPanel />
      </div>
    </main>
  );
}