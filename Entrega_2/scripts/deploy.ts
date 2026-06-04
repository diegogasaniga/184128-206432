import { ethers } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying Multisig with account:', deployer.address);

  // ── Configure before deploying ──────────────────────────────────────────────
  // Replace these addresses with the actual signer wallets.
  const signerAddresses: string[] = [
    deployer.address,                                    // signer 1 (deployer)
    '0x0000000000000000000000000000000000000001', // signer 2 — REPLACE
    '0x0000000000000000000000000000000000000002', // signer 3 — REPLACE
  ];
  const threshold = 2; // requires 2-of-3 approvals
  // ───────────────────────────────────────────────────────────────────────────

  const Multisig = await ethers.getContractFactory('Multisig');
  const multisig = await Multisig.deploy(signerAddresses, threshold);
  await multisig.waitForDeployment();

  const address = await multisig.getAddress();
  console.log('Multisig deployed to:', address);
  console.log('Signers:', signerAddresses);
  console.log('Threshold:', threshold);
  console.log('\nAdd this to your frontend .env:');
  console.log(`VITE_CONTRACT_ADDRESS=${address}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
