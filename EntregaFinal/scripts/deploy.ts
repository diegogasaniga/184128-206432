import { ethers } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying with account:', deployer.address);

  // Deploy MockERC20
  const Token = await ethers.getContractFactory('MockERC20');
  const token = await Token.deploy('MarketToken', 'MKT');
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log('MockERC20 deployed to:', tokenAddress);

  // Mint some tokens to deployer for testing
  await token.mint(deployer.address, ethers.parseEther('10000'));
  console.log('Minted 10,000 MKT to deployer');

  // Deploy JobMarketplace
  const Marketplace = await ethers.getContractFactory('JobMarketplace');
  const marketplace = await Marketplace.deploy(tokenAddress);
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log('JobMarketplace deployed to:', marketplaceAddress);

  console.log('\n--- Update your frontend .env ---');
  console.log(`VITE_TOKEN_ADDRESS=${tokenAddress}`);
  console.log(`VITE_JOB_MARKETPLACE_ADDRESS=${marketplaceAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
