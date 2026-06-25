import { expect } from 'chai';
import { ethers } from 'hardhat';
import { time } from '@nomicfoundation/hardhat-network-helpers';
import { JobMarketplace, MockERC20, Multisig } from '../typechain-types';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';

const REASON = ethers.id('approved');
const REJECT_REASON = ethers.id('rejected');
const DELIVERABLE = ethers.id('deliverable-content');
const BUDGET = ethers.parseEther('100');
const ONE_DAY = 86400;

async function deployFixture() {
  const [owner, client, evaluator, provider, stranger] = await ethers.getSigners();

  const Token = await ethers.getContractFactory('MockERC20');
  const token = (await Token.deploy('TestToken', 'TTK')) as MockERC20;

  const Marketplace = await ethers.getContractFactory('JobMarketplace');
  const marketplace = (await Marketplace.deploy(await token.getAddress())) as JobMarketplace;

  // Mint tokens to client and approve marketplace
  await token.mint(client.address, BUDGET * 10n);
  await token.connect(client).approve(await marketplace.getAddress(), BUDGET * 10n);

  const expiresAt = (await time.latest()) + ONE_DAY;

  return { token, marketplace, owner, client, evaluator, provider, stranger, expiresAt };
}

async function deployWithJob() {
  const base = await deployFixture();
  const { marketplace, client, evaluator, provider, expiresAt } = base;

  await marketplace
    .connect(client)
    .createJob('Test job', BUDGET, evaluator.address, provider.address, expiresAt);

  return { ...base, jobId: 0n };
}

async function deployFunded() {
  const base = await deployWithJob();
  await base.marketplace.connect(base.client).fund(0n);
  return base;
}

async function deploySubmitted() {
  const base = await deployFunded();
  await base.marketplace.connect(base.provider).submit(0n, DELIVERABLE);
  return base;
}

// ── Happy Path ────────────────────────────────────────────────────────────────

describe('JobMarketplace — Happy Path', function () {
  it('createJob emits JobCreated and stores correct state', async function () {
    const { marketplace, client, evaluator, provider, expiresAt } = await deployFixture();

    await expect(
      marketplace.connect(client).createJob('My job', BUDGET, evaluator.address, provider.address, expiresAt)
    )
      .to.emit(marketplace, 'JobCreated')
      .withArgs(0n, client.address, evaluator.address, provider.address, 'My job', BUDGET, expiresAt);

    const job = await marketplace.getJob(0n);
    expect(job.client).to.equal(client.address);
    expect(job.evaluator).to.equal(evaluator.address);
    expect(job.provider).to.equal(provider.address);
    expect(job.status).to.equal(0); // Open
    expect(job.budget).to.equal(BUDGET);
  });

  it('fund transfers tokens to escrow', async function () {
    const { marketplace, token, client } = await deployWithJob();
    const marketAddr = await marketplace.getAddress();

    const before = await token.balanceOf(marketAddr);
    await expect(marketplace.connect(client).fund(0n))
      .to.emit(marketplace, 'JobFunded')
      .withArgs(0n);
    const after = await token.balanceOf(marketAddr);

    expect(after - before).to.equal(BUDGET);
    const job = await marketplace.getJob(0n);
    expect(job.status).to.equal(1); // Funded
  });

  it('submit stores deliverableRef and moves to Submitted', async function () {
    const { marketplace, provider } = await deployFunded();

    await expect(marketplace.connect(provider).submit(0n, DELIVERABLE))
      .to.emit(marketplace, 'JobSubmitted')
      .withArgs(0n, DELIVERABLE);

    const job = await marketplace.getJob(0n);
    expect(job.status).to.equal(2); // Submitted
    expect(job.deliverableRef).to.equal(DELIVERABLE);
  });

  it('complete releases funds to provider', async function () {
    const { marketplace, token, evaluator, provider } = await deploySubmitted();

    const before = await token.balanceOf(provider.address);
    await expect(marketplace.connect(evaluator).complete(0n, REASON))
      .to.emit(marketplace, 'JobCompleted')
      .withArgs(0n, REASON);
    const after = await token.balanceOf(provider.address);

    expect(after - before).to.equal(BUDGET);
    const job = await marketplace.getJob(0n);
    expect(job.status).to.equal(3); // Completed
  });
});

// ── Rejection ─────────────────────────────────────────────────────────────────

describe('JobMarketplace — Rejection', function () {
  it('client can reject in Open (no refund needed)', async function () {
    const { marketplace, client } = await deployWithJob();

    await expect(marketplace.connect(client).reject(0n, REJECT_REASON))
      .to.emit(marketplace, 'JobRejected')
      .withArgs(0n, REJECT_REASON);

    const job = await marketplace.getJob(0n);
    expect(job.status).to.equal(4); // Rejected
  });

  it('evaluator can reject in Funded and refunds client', async function () {
    const { marketplace, token, client, evaluator } = await deployFunded();

    const before = await token.balanceOf(client.address);
    await expect(marketplace.connect(evaluator).reject(0n, REJECT_REASON))
      .to.emit(marketplace, 'JobRejected')
      .withArgs(0n, REJECT_REASON);
    const after = await token.balanceOf(client.address);

    expect(after - before).to.equal(BUDGET);
    const job = await marketplace.getJob(0n);
    expect(job.status).to.equal(4); // Rejected
  });

  it('evaluator can reject in Submitted and refunds client', async function () {
    const { marketplace, token, client, evaluator } = await deploySubmitted();

    const before = await token.balanceOf(client.address);
    await expect(marketplace.connect(evaluator).reject(0n, REJECT_REASON))
      .to.emit(marketplace, 'JobRejected')
      .withArgs(0n, REJECT_REASON);
    const after = await token.balanceOf(client.address);

    expect(after - before).to.equal(BUDGET);
  });
});

// ── Expiration ────────────────────────────────────────────────────────────────

describe('JobMarketplace — Expiration', function () {
  it('claimRefund works from Funded after expiry', async function () {
    const { marketplace, token, client } = await deployFunded();

    await time.increase(ONE_DAY + 1);

    const before = await token.balanceOf(client.address);
    await expect(marketplace.claimRefund(0n))
      .to.emit(marketplace, 'JobExpired')
      .withArgs(0n);
    const after = await token.balanceOf(client.address);

    expect(after - before).to.equal(BUDGET);
    const job = await marketplace.getJob(0n);
    expect(job.status).to.equal(5); // Expired
  });

  it('claimRefund works from Submitted after expiry', async function () {
    const { marketplace, token, client } = await deploySubmitted();

    await time.increase(ONE_DAY + 1);

    const before = await token.balanceOf(client.address);
    await marketplace.claimRefund(0n);
    const after = await token.balanceOf(client.address);

    expect(after - before).to.equal(BUDGET);
  });

  it('claimRefund reverts before expiry', async function () {
    const { marketplace } = await deployFunded();
    await expect(marketplace.claimRefund(0n)).to.be.revertedWithCustomError(marketplace, 'NotExpired');
  });

  it('claimRefund reverts if job is Open', async function () {
    const { marketplace } = await deployWithJob();
    await time.increase(ONE_DAY + 1);
    await expect(marketplace.claimRefund(0n)).to.be.revertedWithCustomError(marketplace, 'InvalidStatus');
  });
});

// ── Access Control ────────────────────────────────────────────────────────────

describe('JobMarketplace — Access Control', function () {
  it('setProvider reverts if not client', async function () {
    const { marketplace, stranger, provider } = await deployWithJob();
    await expect(
      marketplace.connect(stranger).setProvider(0n, provider.address)
    ).to.be.revertedWithCustomError(marketplace, 'NotClient');
  });

  it('fund reverts if not client', async function () {
    const { marketplace, stranger } = await deployWithJob();
    await expect(marketplace.connect(stranger).fund(0n)).to.be.revertedWithCustomError(marketplace, 'NotClient');
  });

  it('submit reverts if not provider', async function () {
    const { marketplace, stranger } = await deployFunded();
    await expect(
      marketplace.connect(stranger).submit(0n, DELIVERABLE)
    ).to.be.revertedWithCustomError(marketplace, 'NotProvider');
  });

  it('complete reverts if not evaluator', async function () {
    const { marketplace, stranger } = await deploySubmitted();
    await expect(
      marketplace.connect(stranger).complete(0n, REASON)
    ).to.be.revertedWithCustomError(marketplace, 'NotEvaluator');
  });

  it('reject (Open) reverts if not client', async function () {
    const { marketplace, stranger } = await deployWithJob();
    await expect(
      marketplace.connect(stranger).reject(0n, REJECT_REASON)
    ).to.be.revertedWithCustomError(marketplace, 'NotClient');
  });

  it('reject (Funded) reverts if not evaluator', async function () {
    const { marketplace, stranger } = await deployFunded();
    await expect(
      marketplace.connect(stranger).reject(0n, REJECT_REASON)
    ).to.be.revertedWithCustomError(marketplace, 'NotEvaluator');
  });

  it('setProvider reverts if provider already set', async function () {
    const { marketplace, client, stranger } = await deployWithJob();
    await expect(
      marketplace.connect(client).setProvider(0n, stranger.address)
    ).to.be.revertedWithCustomError(marketplace, 'ProviderAlreadySet');
  });
});

// ── State Transitions ─────────────────────────────────────────────────────────

describe('JobMarketplace — Invalid State Transitions', function () {
  it('cannot fund twice', async function () {
    const { marketplace, client } = await deployFunded();
    await expect(marketplace.connect(client).fund(0n)).to.be.revertedWithCustomError(marketplace, 'InvalidStatus');
  });

  it('cannot complete from Funded (must be Submitted)', async function () {
    const { marketplace, evaluator } = await deployFunded();
    await expect(
      marketplace.connect(evaluator).complete(0n, REASON)
    ).to.be.revertedWithCustomError(marketplace, 'InvalidStatus');
  });

  it('cannot submit from Submitted again', async function () {
    const { marketplace, provider } = await deploySubmitted();
    await expect(
      marketplace.connect(provider).submit(0n, DELIVERABLE)
    ).to.be.revertedWithCustomError(marketplace, 'InvalidStatus');
  });
});

// ── Multisig as Evaluator ─────────────────────────────────────────────────────

describe('JobMarketplace — Multisig as Evaluator', function () {
  it('complete succeeds only after Multisig reaches threshold and executes', async function () {
    const signers = await ethers.getSigners();
    const [, client, , provider] = signers;
    const signer1 = signers[5];
    const signer2 = signers[6];
    const signer3 = signers[7];

    // Deploy MockERC20
    const Token = await ethers.getContractFactory('MockERC20');
    const token = (await Token.deploy('TestToken', 'TTK')) as MockERC20;

    // Deploy Marketplace
    const Marketplace = await ethers.getContractFactory('JobMarketplace');
    const marketplace = (await Marketplace.deploy(await token.getAddress())) as JobMarketplace;

    // Deploy Multisig with 2-of-3
    const MultisigFactory = await ethers.getContractFactory('Multisig');
    const multisig = (await MultisigFactory.deploy(
      [signer1.address, signer2.address, signer3.address],
      2n
    )) as Multisig;

    const marketAddr = await marketplace.getAddress();
    const multisigAddr = await multisig.getAddress();

    // Fund client
    await token.mint(client.address, BUDGET);
    await token.connect(client).approve(marketAddr, BUDGET);

    // Create job with Multisig as evaluator
    const expiresAt = (await time.latest()) + ONE_DAY;
    await marketplace
      .connect(client)
      .createJob('Multisig job', BUDGET, multisigAddr, provider.address, expiresAt);

    // Fund and submit
    await marketplace.connect(client).fund(0n);
    await marketplace.connect(provider).submit(0n, DELIVERABLE);

    // Attempt complete directly as signer — must fail (signer is not the evaluator)
    await expect(
      marketplace.connect(signer1).complete(0n, REASON)
    ).to.be.revertedWithCustomError(marketplace, 'NotEvaluator');

    // Build calldata for complete(0, REASON)
    const calldata = marketplace.interface.encodeFunctionData('complete', [0n, REASON]);

    // Signer1 proposes via Multisig
    await multisig.connect(signer1).propose(marketAddr, 0n, calldata);

    // Only 1 approval so far — execute must fail (below threshold)
    await multisig.connect(signer1).approve(0n);
    await expect(multisig.connect(signer1).execute(0n)).to.be.revertedWith('Below threshold');

    // Signer2 approves — now at threshold
    await multisig.connect(signer2).approve(0n);

    // Execute succeeds
    const before = await token.balanceOf(provider.address);
    await multisig.connect(signer2).execute(0n);
    const after = await token.balanceOf(provider.address);

    expect(after - before).to.equal(BUDGET);
    const job = await marketplace.getJob(0n);
    expect(job.status).to.equal(3); // Completed
  });
});

// ── createJob Validations ─────────────────────────────────────────────────────

describe('JobMarketplace — createJob Validations', function () {
  it('reverts with ZeroBudget', async function () {
    const { marketplace, client, evaluator, provider, expiresAt } = await deployFixture();
    await expect(
      marketplace.connect(client).createJob('job', 0n, evaluator.address, provider.address, expiresAt)
    ).to.be.revertedWithCustomError(marketplace, 'ZeroBudget');
  });

  it('reverts with ZeroEvaluator', async function () {
    const { marketplace, client, provider, expiresAt } = await deployFixture();
    await expect(
      marketplace
        .connect(client)
        .createJob('job', BUDGET, ethers.ZeroAddress, provider.address, expiresAt)
    ).to.be.revertedWithCustomError(marketplace, 'ZeroEvaluator');
  });

  it('reverts with InvalidExpiry for past timestamp', async function () {
    const { marketplace, client, evaluator, provider } = await deployFixture();
    const past = (await time.latest()) - 1;
    await expect(
      marketplace.connect(client).createJob('job', BUDGET, evaluator.address, provider.address, past)
    ).to.be.revertedWithCustomError(marketplace, 'InvalidExpiry');
  });

  it('createJob without provider, then setProvider works', async function () {
    const { marketplace, client, evaluator, provider, expiresAt } = await deployFixture();

    await marketplace
      .connect(client)
      .createJob('no provider', BUDGET, evaluator.address, ethers.ZeroAddress, expiresAt);

    await expect(marketplace.connect(client).setProvider(0n, provider.address))
      .to.emit(marketplace, 'ProviderSet')
      .withArgs(0n, provider.address);

    const job = await marketplace.getJob(0n);
    expect(job.provider).to.equal(provider.address);
  });
});
