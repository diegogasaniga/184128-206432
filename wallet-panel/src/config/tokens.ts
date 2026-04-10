export type TokenConfig = {
  address: `0x${string}`;
  label: string;
};

export const TOKENS: TokenConfig[] = [
  {
    label: 'USDC',
    address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  },
  {
    label: 'LINK',
    address: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
  },
];