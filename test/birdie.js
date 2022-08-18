const { expect } = require('./chai-setup');
const { setupUsers, toWei, impersonateAccount, Roles } = require('./utils');
const { ethers, deployments, getNamedAccounts, getUnnamedAccounts, network } = require('hardhat');

let deployer;
let birdie;
let users;
let multiSigAccount;

describe('Birdie', () => {
  beforeEach(async () => {
    await deployments.fixture(['main']);
    deployer = (await getNamedAccounts()).deployer;
    birdie = await ethers.getContract('Birdie');
    users = await setupUsers((await getUnnamedAccounts()), { birdie });
    multiSigAccount = await impersonateAccount(network.config.multiSigAddress, users[0].address, { birdie });
  });

  it('deploys with correct info', async () => {
    expect(await birdie.name()).to.eq('Birdie');
    expect(await birdie.symbol()).to.eq('BRD');
    expect(await birdie.decimals()).to.eq(18);
  });

  it('sets mints initial supply to multiSigAddress', async () => {
    expect(await birdie.balanceOf(multiSigAccount.address)).to.eq(toWei('1000000'));
  });

  describe('dispense', () => {
    beforeEach(async () => {
      await multiSigAccount.birdie.grantRole(Roles.minter, users[0].address);
    });

    it('is restricted to MINTER_ROLE', async () => {
      expect(multiSigAccount.birdie.dispense(users[0].address, toWei('10'), 0x00, 0x00)).to.be.reverted;
      expect(users[0].birdie.dispense(users[0].address, toWei('10'), 0x00, 0x00)).to.not.be.reverted;
    });

    it('mints token to target account', async () => {
      await users[0].birdie.dispense(users[0].address, toWei('10'), 0x00, 0x00);
      expect(await birdie.balanceOf(users[0].address)).to.eq(toWei('10'));
    });
  });

  describe('destroy', () => {
    beforeEach(async () => {
      await multiSigAccount.birdie.grantRole(Roles.minter, users[0].address);
      await multiSigAccount.birdie.grantRole(Roles.burner, users[0].address);
    });

    it('is restricted to BURNER_ROLE', async () => {
      expect(multiSigAccount.birdie.destroy(users[0].address, toWei('10'), 0x00, 0x00)).to.be.reverted;
      expect(users[0].birdie.destroy(users[0].address, toWei('10'), 0x00, 0x00)).to.not.be.reverted;
    });

    it('removes token from target account', async () => {
      await users[0].birdie.dispense(users[0].address, toWei('10'), 0x00, 0x00);
      await users[0].birdie.destroy(users[0].address, toWei('5'), 0x00, 0x00);
      expect(await birdie.balanceOf(users[0].address)).to.eq(toWei('5'));
    });
  });

  describe('post deploy roles', () => {
    it('only has multiSigAccount in DEFAULT_ADMIN_ROLE', async () => {
      expect(await birdie.hasRole(Roles.defaultAdmin, multiSigAccount.address)).to.eq(true);
      expect(await birdie.hasRole(Roles.defaultAdmin, deployer)).to.eq(false);
    });
  });
});
