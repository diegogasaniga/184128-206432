import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Link } from 'react-router-dom';

export default function NavBar() {
  return (
    <header className="header">
      <Link to="/" style={{ textDecoration: 'none' }}>
        <h1 className="logo">Job Marketplace</h1>
      </Link>
      <ConnectButton />
    </header>
  );
}
