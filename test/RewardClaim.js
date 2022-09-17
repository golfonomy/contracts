const { expect } = require('./chai-setup');
const { setupUsers, toWei, impersonateAccount, claimSignature } = require('./utils');
const { ethers, deployments, getUnnamedAccounts, network } = require('hardhat');

let serviceAccount;
let birdie;
let rewardClaim;
let users;
let multiSigAccount;

describe('RewardClaim', () => {
  beforeEach(async () => {
    await deployments.fixture(['main']);
    birdie = await ethers.getContract('Birdie');
    rewardClaim = await ethers.getContract('RewardClaim');
    users = await setupUsers((await getUnnamedAccounts()), { rewardClaim });
    multiSigAccount = await impersonateAccount(network.config.multiSigAddress, users[0].address, { rewardClaim });
    serviceAccount = await impersonateAccount(network.config.claimAccountAddress, users[1].address, { rewardClaim });
  });

  it('deploys with correct info', async () => {
    expect(await rewardClaim.paused()).to.eq(false);
  });

  describe('rotateServiceAccount', () => {
    it('is only callable by current serviceAccount and multiSig', async () => {
      await expect(users[0].rewardClaim.rotateServiceAccount(users[0].address)).to.be.revertedWith('Sender not permitted');
      await expect(serviceAccount.rewardClaim.rotateServiceAccount(users[5].address)).to.not.be.reverted;
      await expect(multiSigAccount.rewardClaim.rotateServiceAccount(serviceAccount.address)).to.not.be.reverted;
    });

    it('updates serviceAccount with new account', async () => {
      await serviceAccount.rewardClaim.rotateServiceAccount(users[0].address);
      await expect(users[0].rewardClaim.rotateServiceAccount(users[1].address)).to.not.be.reverted;
    });
  });

  describe('togglePause', () => {
    it('is only callable by multiSigManager', async () => {
      await expect(serviceAccount.rewardClaim.togglePause()).to.be.revertedWith('Sender not permitted');
      await expect(multiSigAccount.rewardClaim.togglePause()).to.not.be.reverted;
    });

    it('toggles paused state', async () => {
      await multiSigAccount.rewardClaim.togglePause();
      expect(await rewardClaim.paused()).to.eq(true);
      await multiSigAccount.rewardClaim.togglePause();
      expect(await rewardClaim.paused()).to.eq(false);
    });
  });

  describe('claim', () => {
    beforeEach(async () => {
      await serviceAccount.rewardClaim.rotateServiceAccount(users[0].address);
    });

    it('only allows when unpaused', async () => {
      let claimSig = await claimSignature(users[1].address, toWei('10'), rewardClaim);
      await expect(users[1].rewardClaim.claim(claimSig)).to.not.be.reverted;
      await multiSigAccount.rewardClaim.togglePause();
      await expect(users[1].rewardClaim.claim(claimSig)).to.be.revertedWith('Reward claiming is paused');
    });

    it('does not allow sender to be the service account', async () => {
      let claimSig = await claimSignature(users[0].address, toWei('10'), rewardClaim);
      await expect(users[0].rewardClaim.claim(claimSig)).to.be.revertedWith('Service account not allowed to claim');
    });

    it('does not allow out of date claim signatures', async () => {
      let claimSig = await claimSignature(users[1].address, toWei('10'), rewardClaim, Math.round(new Date() / 1000) - 600);
      await expect(users[1].rewardClaim.claim(claimSig)).to.be.revertedWith('Expired claim deadline');
    });

    it('does not allow a claim signature to be used more than once', async () => {
      let claimSig = await claimSignature(users[1].address, toWei('10'), rewardClaim);
      await expect(users[1].rewardClaim.claim(claimSig)).to.not.be.reverted;
      await expect(users[1].rewardClaim.claim(claimSig)).to.be.revertedWith('Invalid claim signature');
    });
  
    it('requires a valid claim signature', async () => {
      let claimSig = await claimSignature(users[1].address, toWei('10'), rewardClaim);
      await expect(users[2].rewardClaim.claim(claimSig)).to.be.reverted;
      await expect(users[1].rewardClaim.claim(claimSig)).to.not.be.reverted;
    });
  
    it('dispenses to recipient', async () => {
      let claimSig = await claimSignature(users[1].address, toWei('10'), rewardClaim);
      await users[1].rewardClaim.claim(claimSig);
      expect((await birdie.balanceOf(users[1].address)).toString()).to.eq(toWei('10'));
    });
  });
});
