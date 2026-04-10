import TokenCard from './TokenCard';
import { TOKENS } from '../config/tokens';

export default function TokensPanel() {
  return (
    <section className="panel">
      <h2>Saldos de Tokens</h2>

      <div className="tokens-grid">
        {TOKENS.map((token) => (
          <TokenCard
            key={token.address}
            address={token.address}
            fallbackLabel={token.label}
          />
        ))}
      </div>
    </section>
  );
}