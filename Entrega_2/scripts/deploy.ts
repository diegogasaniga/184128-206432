import { ethers } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying Multisig with account:', deployer.address);

  // ── Configure before deploying ──────────────────────────────────────────────
  // Replace these addresses with the actual signer wallets.
  const signerAddresses: string[] = [
    '0x447b46E7a4C959fE30eBCdF01eA2B83eDFC2FC8a', // signer 1
    '0x1066594e4483AE78eb21ECE5F475f8f9b5c8224d', // signer 2
    '0x5478eEE9fbe0c2a994395A1848c62583F376fa2F', // signer 3
    '0x0f1925e7003fbF4b4315409A3c78e65bd1F4B4dB', // signer 4
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
