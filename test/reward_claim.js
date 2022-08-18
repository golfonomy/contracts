const { expect } = require('./chai-setup');
const { setupUsers, toWei, impersonateAccount, claimSignature } = require('./utils');
const { ethers, deployments, getNamedAccounts, getUnnamedAccounts, network } = require('hardhat');

let deployer;
let birdie;
let rewardClaim;
let users;
let multiSigAccount;

describe('RewardClaim', () => {
  beforeEach(async () => {
    await deployments.fixture(['main']);
    deployer = (await getNamedAccounts()).deployer;
    birdie = await ethers.getContract('Birdie');
    rewardClaim = await ethers.getContract('RewardClaim');
    users = await setupUsers((await getUnnamedAccounts()), { rewardClaim });
    multiSigAccount = await impersonateAccount(network.config.multiSigAddress, users[0].address, { rewardClaim });
    deployer = await impersonateAccount(deployer, users[1].address, { rewardClaim });
  });

  it('deploys with correct info', async () => {
    expect(await rewardClaim.paused()).to.eq(false);
  });

  describe('rotateServiceAccount', () => {
    it('is only callable by current serviceAccount and multiSig', () => {
      expect(users[0].rewardClaim.rotateServiceAccount(users[0].address)).to.be.revertedWith('Sender not permitted');
      expect(multiSigAccount.rewardClaim.rotateServiceAccount(multiSigAccount.address)).to.not.be.reverted;
      expect(deployer.rewardClaim.rotateServiceAccount(multiSigAccount.address)).to.not.be.reverted;
    });

    it('updates serviceAccount with new account', async () => {
      await deployer.rewardClaim.rotateServiceAccount(users[0].address);
      expect(users[0].rewardClaim.rotateServiceAccount(users[1].address)).to.not.be.reverted;
    });
  });

  describe('togglePause', () => {
    it('is only callable by multiSigManager', () => {
      expect(deployer.rewardClaim.togglePause()).to.be.revertedWith('Sender not permitted');
      expect(multiSigAccount.rewardClaim.togglePause()).to.not.be.reverted;
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
      await deployer.rewardClaim.rotateServiceAccount(users[0].address);
    });

    it('only allows when unpaused', async () => {
      let claimSig = await claimSignature(users[1].address, toWei('10'), rewardClaim);
      expect(users[1].rewardClaim.claim(claimSig)).to.not.be.reverted;
      await multiSigAccount.rewardClaim.togglePause();
      expect(users[1].rewardClaim.claim(claimSig)).to.be.revertedWith('Reward claiming is paused');
    });

    it('does not allow sender to be the service account', async () => {
      let claimSig = await claimSignature(users[0].address, toWei('10'), rewardClaim);
      expect(users[0].rewardClaim.claim(claimSig)).to.be.revertedWith('Service account not allowed to claim');
    });

    it('does not allow out of date claim signatures', async () => {
      let claimSig = await claimSignature(users[1].address, toWei('10'), rewardClaim, Math.round(new Date() / 1000) - 600);
      expect(users[1].rewardClaim.claim(claimSig)).to.be.revertedWith('Expired claim deadline');
    });

    it('does not allow a claim signature to be used more than once', async () => {
      let claimSig = await claimSignature(users[1].address, toWei('10'), rewardClaim);
      expect(users[1].rewardClaim.claim(claimSig)).to.not.be.reverted;
      expect(users[1].rewardClaim.claim(claimSig)).to.be.revertedWith('Invalid claim signature');
    });
  
    it('requires a valid claim signature', async () => {
      let claimSig = await claimSignature(users[1].address, toWei('10'), rewardClaim);
      expect(users[2].rewardClaim.claim(claimSig)).to.be.reverted;
      expect(users[1].rewardClaim.claim(claimSig)).to.not.be.reverted;
    });
  
    it('dispenses to recipient', async () => {
      let claimSig = await claimSignature(users[1].address, toWei('10'), rewardClaim);
      await users[1].rewardClaim.claim(claimSig);
      expect((await birdie.balanceOf(users[1].address)).toString()).to.eq(toWei('10'));
    });
  });
});
