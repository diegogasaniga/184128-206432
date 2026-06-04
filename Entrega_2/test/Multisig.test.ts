import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('Multisig', function () {
  async function deployFixture() {
    const [owner, signer1, signer2, nonSigner] = await ethers.getSigners();
    const signerAddresses = [owner.address, signer1.address, signer2.address];
    const threshold = 2;

    const Multisig = await ethers.getContractFactory('Multisig');
    const multisig = await Multisig.deploy(signerAddresses, threshold);

    return { multisig, owner, signer1, signer2, nonSigner, threshold };
  }

  // ── Deployment ──────────────────────────────────────────────────────────────

  describe('Deployment', function () {
    it('sets signers and threshold correctly', async function () {
      const { multisig, owner, signer1, signer2, threshold } = await loadFixture(deployFixture);

      expect(await multisig.threshold()).to.equal(threshold);
      expect(await multisig.isSigner(owner.address)).to.be.true;
      expect(await multisig.isSigner(signer1.address)).to.be.true;
      expect(await multisig.isSigner(signer2.address)).to.be.true;
    });

    it('rejects threshold larger than signer count', async function () {
      const [owner] = await ethers.getSigners();
      const Multisig = await ethers.getContractFactory('Multisig');
      await expect(Multisig.deploy([owner.address], 2)).to.be.revertedWith('Invalid threshold');
    });

    it('rejects zero threshold', async function () {
      const [owner] = await ethers.getSigners();
      const Multisig = await ethers.getContractFactory('Multisig');
      await expect(Multisig.deploy([owner.address], 0)).to.be.revertedWith('Invalid threshold');
    });

    it('rejects duplicate signers', async function () {
      const [owner] = await ethers.getSigners();
      const Multisig = await ethers.getContractFactory('Multisig');
      await expect(Multisig.deploy([owner.address, owner.address], 1)).to.be.revertedWith('Duplicate signer');
    });
  });

  // ── Propose ─────────────────────────────────────────────────────────────────

  describe('Propose', function () {
    it('allows a signer to create a proposal', async function () {
      const { multisig, owner } = await loadFixture(deployFixture);

      await expect(multisig.connect(owner).propose(owner.address, 0n, '0x'))
        .to.emit(multisig, 'ProposalCreated')
        .withArgs(0n, owner.address, owner.address, 0n);

      expect(await multisig.getProposalCount()).to.equal(1n);
    });

    it('rejects proposals from non-signers', async function () {
      const { multisig, nonSigner } = await loadFixture(deployFixture);

      await expect(multisig.connect(nonSigner).propose(nonSigner.address, 0n, '0x'))
        .to.be.revertedWith('Not a signer');
    });
  });

  // ── Approve ─────────────────────────────────────────────────────────────────

  describe('Approve', function () {
    it('allows a signer to approve a pending proposal', async function () {
      const { multisig, owner, signer1 } = await loadFixture(deployFixture);
      await multisig.connect(owner).propose(owner.address, 0n, '0x');

      await expect(multisig.connect(signer1).approve(0n))
        .to.emit(multisig, 'Approved')
        .withArgs(0n, signer1.address);
    });

    it('rejects double approval from the same signer', async function () {
      const { multisig, owner, signer1 } = await loadFixture(deployFixture);
      await multisig.connect(owner).propose(owner.address, 0n, '0x');
      await multisig.connect(signer1).approve(0n);

      await expect(multisig.connect(signer1).approve(0n))
        .to.be.revertedWith('Already approved');
    });

    it('rejects approval from non-signers', async function () {
      const { multisig, owner, nonSigner } = await loadFixture(deployFixture);
      await multisig.connect(owner).propose(owner.address, 0n, '0x');

      await expect(multisig.connect(nonSigner).approve(0n))
        .to.be.revertedWith('Not a signer');
    });

    it('rejects approval on a cancelled proposal', async function () {
      const { multisig, owner, signer1 } = await loadFixture(deployFixture);
      await multisig.connect(owner).propose(owner.address, 0n, '0x');
      await multisig.connect(owner).cancel(0n);

      await expect(multisig.connect(signer1).approve(0n))
        .to.be.revertedWith('Cancelled');
    });
  });

  // ── Execute ─────────────────────────────────────────────────────────────────

  describe('Execute', function () {
    it('executes when threshold approvals are reached', async function () {
      const { multisig, owner, signer1, signer2 } = await loadFixture(deployFixture);
      await multisig.connect(owner).propose(owner.address, 0n, '0x');
      await multisig.connect(owner).approve(0n);
      await multisig.connect(signer1).approve(0n);

      await expect(multisig.connect(signer2).execute(0n))
        .to.emit(multisig, 'Executed')
        .withArgs(0n, signer2.address);
    });

    it('rejects execution below threshold', async function () {
      const { multisig, owner, signer1 } = await loadFixture(deployFixture);
      await multisig.connect(owner).propose(owner.address, 0n, '0x');
      await multisig.connect(owner).approve(0n);

      await expect(multisig.connect(signer1).execute(0n))
        .to.be.revertedWith('Below threshold');
    });

    it('rejects double execution', async function () {
      const { multisig, owner, signer1, signer2 } = await loadFixture(deployFixture);
      await multisig.connect(owner).propose(owner.address, 0n, '0x');
      await multisig.connect(owner).approve(0n);
      await multisig.connect(signer1).approve(0n);
      await multisig.connect(signer2).execute(0n);

      await expect(multisig.connect(signer2).execute(0n))
        .to.be.revertedWith('Already executed');
    });

    it('sends ETH to destination on execution', async function () {
      const { multisig, owner, signer1, signer2, nonSigner } = await loadFixture(deployFixture);

      // Fund the contract
      await owner.sendTransaction({ to: await multisig.getAddress(), value: ethers.parseEther('1') });

      const before = await ethers.provider.getBalance(nonSigner.address);
      await multisig.connect(owner).propose(nonSigner.address, ethers.parseEther('0.5'), '0x');
      await multisig.connect(owner).approve(0n);
      await multisig.connect(signer1).approve(0n);
      await multisig.connect(signer2).execute(0n);

      const after = await ethers.provider.getBalance(nonSigner.address);
      expect(after - before).to.equal(ethers.parseEther('0.5'));
    });
  });

  // ── Cancel ──────────────────────────────────────────────────────────────────

  describe('Cancel', function () {
    it('allows the proposer to cancel a pending proposal', async function () {
      const { multisig, owner } = await loadFixture(deployFixture);
      await multisig.connect(owner).propose(owner.address, 0n, '0x');

      await expect(multisig.connect(owner).cancel(0n))
        .to.emit(multisig, 'Cancelled')
        .withArgs(0n, owner.address);
    });

    it('rejects cancellation from a non-proposer', async function () {
      const { multisig, owner, signer1 } = await loadFixture(deployFixture);
      await multisig.connect(owner).propose(owner.address, 0n, '0x');

      await expect(multisig.connect(signer1).cancel(0n))
        .to.be.revertedWith('Not proposer');
    });

    it('rejects cancellation of an already executed proposal', async function () {
      const { multisig, owner, signer1, signer2 } = await loadFixture(deployFixture);
      await multisig.connect(owner).propose(owner.address, 0n, '0x');
      await multisig.connect(owner).approve(0n);
      await multisig.connect(signer1).approve(0n);
      await multisig.connect(signer2).execute(0n);

      await expect(multisig.connect(owner).cancel(0n))
        .to.be.revertedWith('Already executed');
    });
  });
});
