import { Routes, Route } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import NavBar from './components/NavBar';
import JobsPage from './pages/JobsPage';
import JobDetailPage from './pages/JobDetailPage';
import CreateJobPage from './pages/CreateJobPage';

export default function App() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <main className="app">
        <div className="connect-box">
          <h1>Job Marketplace</h1>
          <p>Conectá tu billetera para interactuar con el marketplace.</p>
          <ConnectButton />
        </div>
      </main>
    );
  }

  return (
    <main className="app">
      <NavBar />
      <div className="content">
        <Routes>
          <Route path="/" element={<JobsPage />} />
          <Route path="/jobs/:id" element={<JobDetailPage />} />
          <Route path="/create" element={<CreateJobPage />} />
        </Routes>
      </div>
    </main>
  );
}
