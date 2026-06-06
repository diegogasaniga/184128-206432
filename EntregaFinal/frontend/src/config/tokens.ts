export type TokenConfig = {
  address: `0x${string}`;
  label: string;
};

const MKT_ADDRESS = import.meta.env.VITE_TOKEN_ADDRESS as `0x${string}` | undefined;

const BASE_TOKENS: TokenConfig[] = [
  { label: 'USDC', address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' },
  { label: 'LINK', address: '0x779877A7B0D9E8603169DdbD7836e478b4624789' },
];

export const TOKENS: TokenConfig[] = MKT_ADDRESS
  ? [{ label: 'MKT', address: MKT_ADDRESS }, ...BASE_TOKENS]
  : BASE_TOKENS;
