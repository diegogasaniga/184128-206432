export const JOB_MARKETPLACE_ABI = [
  // ── Events ───────────────────────────────────────────────────────────────────
  {
    type: 'event',
    name: 'JobCreated',
    inputs: [
      { name: 'jobId', type: 'uint256', indexed: true },
      { name: 'client', type: 'address', indexed: true },
      { name: 'evaluator', type: 'address', indexed: true },
      { name: 'provider', type: 'address', indexed: false },
      { name: 'description', type: 'string', indexed: false },
      { name: 'budget', type: 'uint256', indexed: false },
      { name: 'expiresAt', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ProviderSet',
    inputs: [
      { name: 'jobId', type: 'uint256', indexed: true },
      { name: 'provider', type: 'address', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'JobFunded',
    inputs: [{ name: 'jobId', type: 'uint256', indexed: true }],
  },
  {
    type: 'event',
    name: 'JobSubmitted',
    inputs: [
      { name: 'jobId', type: 'uint256', indexed: true },
      { name: 'deliverableRef', type: 'bytes32', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'JobCompleted',
    inputs: [
      { name: 'jobId', type: 'uint256', indexed: true },
      { name: 'reason', type: 'bytes32', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'JobRejected',
    inputs: [
      { name: 'jobId', type: 'uint256', indexed: true },
      { name: 'reason', type: 'bytes32', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'JobExpired',
    inputs: [{ name: 'jobId', type: 'uint256', indexed: true }],
  },

  // ── Errors ───────────────────────────────────────────────────────────────────
  { type: 'error', name: 'NotClient', inputs: [] },
  { type: 'error', name: 'NotProvider', inputs: [] },
  { type: 'error', name: 'NotEvaluator', inputs: [] },
  { type: 'error', name: 'InvalidStatus', inputs: [{ name: 'current', type: 'uint8' }] },
  { type: 'error', name: 'ProviderAlreadySet', inputs: [] },
  { type: 'error', name: 'NotExpired', inputs: [] },
  { type: 'error', name: 'ZeroBudget', inputs: [] },
  { type: 'error', name: 'ZeroEvaluator', inputs: [] },
  { type: 'error', name: 'InvalidExpiry', inputs: [] },

  // ── Functions ────────────────────────────────────────────────────────────────
  {
    type: 'function',
    name: 'token',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'createJob',
    inputs: [
      { name: 'description', type: 'string' },
      { name: 'budget', type: 'uint256' },
      { name: 'evaluator', type: 'address' },
      { name: 'provider', type: 'address' },
      { name: 'expiresAt', type: 'uint256' },
    ],
    outputs: [{ name: 'jobId', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setProvider',
    inputs: [
      { name: 'jobId', type: 'uint256' },
      { name: 'provider', type: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'fund',
    inputs: [{ name: 'jobId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'submit',
    inputs: [
      { name: 'jobId', type: 'uint256' },
      { name: 'deliverableRef', type: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'complete',
    inputs: [
      { name: 'jobId', type: 'uint256' },
      { name: 'reason', type: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'reject',
    inputs: [
      { name: 'jobId', type: 'uint256' },
      { name: 'reason', type: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'claimRefund',
    inputs: [{ name: 'jobId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getJob',
    inputs: [{ name: 'jobId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'client', type: 'address' },
          { name: 'evaluator', type: 'address' },
          { name: 'provider', type: 'address' },
          { name: 'description', type: 'string' },
          { name: 'budget', type: 'uint256' },
          { name: 'expiresAt', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'deliverableRef', type: 'bytes32' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getJobCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

export type JobStatus = 0 | 1 | 2 | 3 | 4 | 5;

export const STATUS_LABELS: Record<number, string> = {
  0: 'Open',
  1: 'Funded',
  2: 'Submitted',
  3: 'Completed',
  4: 'Rejected',
  5: 'Expired',
};

export interface Job {
  client: `0x${string}`;
  evaluator: `0x${string}`;
  provider: `0x${string}`;
  description: string;
  budget: bigint;
  expiresAt: bigint;
  status: number;
  deliverableRef: `0x${string}`;
}
