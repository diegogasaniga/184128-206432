import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract } from 'wagmi';
import { CONTRACT_ADDRESS, MULTISIG_ABI } from './config/wagmi';
import ContractInfo from './components/ContractInfo';
import NewProposalForm from './components/NewProposalForm';
import ProposalList from './components/ProposalList';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

export default function App() {
  const { address, isConnected } = useAccount();

  const { data: isSigner } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: MULTISIG_ABI,
    functionName: 'isSigner',
    args: [address ?? ZERO_ADDRESS],
    query: { enabled: !!address && !!CONTRACT_ADDRESS },
  });

  if (!isConnected) {
    return (
      <main className="app">
        <div className="connect-box">
          <h1>Multisig</h1>
          <p>Conectá tu billetera para interactuar con el contrato.</p>
          <ConnectButton />
        </div>
      </main>
    );
  }

  return (
    <main className="app">
      <header className="header">
        <h1>Multisig</h1>
        <ConnectButton />
      </header>

      {!CONTRACT_ADDRESS && (
        <div className="warning-banner">
          VITE_CONTRACT_ADDRESS no está configurado. Desplegá el contrato y actualizá el .env del frontend.
        </div>
      )}

      {CONTRACT_ADDRESS && !isSigner && (
        <div className="warning-banner">
          Tu billetera no es un signer de este contrato. Podés ver las propuestas pero no interactuar.
        </div>
      )}

      <div className="content">
        <ContractInfo />
        {!!isSigner && <NewProposalForm />}
        <ProposalList isSigner={!!isSigner} />
      </div>
    </main>
  );
}
