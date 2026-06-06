import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, isAddress } from 'viem';
import { CONTRACT_ADDRESS, MULTISIG_ABI } from '../config/wagmi';

export default function NewProposalForm() {
  const [to, setTo] = useState('');
  const [value, setValue] = useState('0');
  const [data, setData] = useState('');
  const [validationError, setValidationError] = useState('');

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isSuccess, isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!isAddress(to)) {
      setValidationError('Dirección destino inválida.');
      return;
    }

    const hexData = data.trim() === '' ? '0x' : data.trim();
    if (!/^0x[0-9a-fA-F]*$/.test(hexData)) {
      setValidationError('El calldata debe ser hex válido (ej: 0x o 0xabc123).');
      return;
    }

    writeContract({
      address: CONTRACT_ADDRESS,
      abi: MULTISIG_ABI,
      functionName: 'propose',
      args: [to as `0x${string}`, parseEther(value || '0'), hexData as `0x${string}`],
    });
  };

  return (
    <div className="panel">
      <h2>Nueva Propuesta</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Dirección destino</label>
          <input
            type="text"
            placeholder="0x..."
            value={to}
            onChange={(e) => setTo(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Valor (ETH)</label>
          <input
            type="number"
            min="0"
            step="any"
            placeholder="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Calldata (hex, opcional)</label>
          <input
            type="text"
            placeholder="0x"
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </div>

        {validationError && <p className="tx-status error">{validationError}</p>}

        <button type="submit" className="btn btn-primary" disabled={isPending || isConfirming}>
          {isPending ? 'Confirmando en wallet…' : isConfirming ? 'Esperando bloque…' : 'Proponer'}
        </button>

        {isSuccess && <p className="tx-status success">Propuesta creada correctamente.</p>}
        {error && <p className="tx-status error">{error.message.split('\n')[0]}</p>}
      </form>
    </div>
  );
}
