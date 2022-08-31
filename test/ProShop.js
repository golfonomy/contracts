const { expect } = require('./chai-setup');
const { setupUsers, impersonateAccount, toWei } = require('./utils');
const { ethers, deployments, getNamedAccounts, getUnnamedAccounts, network } = require('hardhat');

let deployer;
let proShop;
let memberCard;
let users;
let multiSigAccount;

describe('ProShop', () => {
  beforeEach(async () => {
    await deployments.fixture(['main']);
    deployer = (await getNamedAccounts()).deployer;
    proShop = await ethers.getContract('ProShop');
    memberCard = await ethers.getContract('MemberCard');
    users = await setupUsers((await getUnnamedAccounts()), { proShop });
    multiSigAccount = await impersonateAccount(network.config.multiSigAddress, users[0].address, { proShop });
  });

  it('deploys with correct info', async () => {
    expect(await proShop.paused()).to.eq(false);
    expect(await proShop.whitelist()).to.eq(false);
  });

  describe('purchaseMemberCard', () => {
    let purchase = (type, value) => proShop.purchaseMemberCard(type, { value: toWei(value) });

    it('reverts when contract is paused', async () => {
      await expect(purchase(0, '.05')).to.not.be.reverted;
      await multiSigAccount.proShop.togglePause();
      await expect(purchase(0, '.05')).to.be.revertedWith('Pro Shop is paused');
    });

    context('when whitelist is enabled', () => {
      it('only allows whitelisted addresses to mint', async () => {
        await multiSigAccount.proShop.updateType(0, [toWei('.05'), '0', '200000', '2', 'play']);
        await expect(purchase(0, '.05')).to.not.be.reverted; 
        await multiSigAccount.proShop.toggleWhitelist();
        await expect(purchase(0, '.05')).to.be.revertedWith('Sender is not whitelisted'); 
        await multiSigAccount.proShop.modifyWhitelist([deployer], [true]);
        await expect(purchase(0, '.05')).to.not.be.reverted; 
      });
    });

    it('reverts when type is invalid', async () => {
      await expect(purchase(44, '.05')).to.be.revertedWith('Invalid card type');
    });
    
    it('reverts when supply will exceed limit', async () => {
      await multiSigAccount.proShop.updateType(0, [toWei('.05'), '0', '1', '2', 'play']);
      await expect(purchase(0, '.05')).to.not.be.reverted;
      await expect(purchase(0, '.05')).to.be.revertedWith('Supply limit reached for card type');
    });
    
    it('reverts when senders purchase count will exceed limit', async () => {
      await expect(purchase(0, '.05')).to.not.be.reverted; 
      await expect(purchase(0, '.05')).to.be.revertedWith('Account has reached purchase limit');
    });

    it('reverts when value passed less than mint price', async () => {
      await expect(purchase(0, '.049')).to.be.revertedWith('Insufficient value');
      await expect(purchase(0, '20')).to.not.be.reverted;
    });

    it('emits a PurchasedCard event', async () => {
      await expect(purchase(0, '.05')).to.emit(proShop, "PurchasedCard").withArgs(0, 'play', toWei('.05'));
    });

    it('mints a MemberCard to the message sender', async () => {
      expect(await memberCard.balanceOf(deployer)).to.eq(0);
      await purchase(0, '.05');
      expect(await memberCard.balanceOf(deployer)).to.eq(1);
    });
  });

  describe('createType', () => {
    it('requires sender to be multSigAccount', async () => {
      await expect(proShop.createType([toWei('.05'), '0', '200000', '1', 'someNewType'])).to.be.reverted;
      await expect(multiSigAccount.proShop.createType([toWei('.05'), '0', '200000', '1', 'someNewType'])).to.not.be.reverted;
    });

    it('adds type name to types', async () => {
      await multiSigAccount.proShop.createType([toWei('.05'), '0', '200000', '1', 'someNewType']);
      await expect(users[0].proShop.purchaseMemberCard(2, { value: toWei('.05') })).to.not.be.reverted;
    });

    it('emits an CreatedType event', async () => {
      let timestamp = Math.round(new Date() / 1000);
      await ethers.provider.send("evm_setNextBlockTimestamp", [timestamp])
      await expect(multiSigAccount.proShop.createType([toWei('.05'), '0', '200000', '1', 'someNewType'])).to.emit(proShop, "CreatedType").withArgs(2, timestamp);
    });
  });

  describe('updateType', () => {
    it('requires sender to be multSigAccount', async () => {
      await expect(proShop.updateType(1, [toWei('.05'), '0', '200000', '1', 'someNewType'])).to.be.reverted;
      await expect(multiSigAccount.proShop.updateType(1, [toWei('.05'), '0', '200000', '1', 'someNewType'])).to.not.be.reverted;
    });

    it('adds type name to types', async () => {
      await multiSigAccount.proShop.updateType(1, [toWei('.01'), '0', '200000', '1', 'someNewType']);
      await expect(users[0].proShop.purchaseMemberCard(1, { value: toWei('.01') })).to.not.be.reverted;
    });

    it('emits an CreatedType event', async () => {
      let timestamp = Math.round(new Date() / 1000);
      await ethers.provider.send("evm_setNextBlockTimestamp", [timestamp])
      await expect(multiSigAccount.proShop.updateType(1, [toWei('.05'), '0', '200000', '1', 'someNewType'])).to.emit(proShop, "UpdatedType").withArgs(1, timestamp);
    });
  });

  describe('togglePause', () => {
    it('is only callable by multiSigManager', async () => {
      await expect(users[0].proShop.togglePause()).to.be.revertedWith('Sender not permitted');
      await expect(multiSigAccount.proShop.togglePause()).to.not.be.reverted;
    });

    it('toggles paused state', async () => {
      await multiSigAccount.proShop.togglePause();
      expect(await proShop.paused()).to.eq(true);
      await multiSigAccount.proShop.togglePause();
      expect(await proShop.paused()).to.eq(false);
    });
  });

  describe('toggleWhitelist', () => {
    it('is only callable by multiSigManager', async () => {
      await expect(users[0].proShop.toggleWhitelist()).to.be.revertedWith('Sender not permitted');
      await expect(multiSigAccount.proShop.toggleWhitelist()).to.not.be.reverted;
    });

    it('toggles whitelist state', async () => {
      await multiSigAccount.proShop.toggleWhitelist();
      expect(await proShop.whitelist()).to.eq(true);
      await multiSigAccount.proShop.toggleWhitelist();
      expect(await proShop.whitelist()).to.eq(false);
    });
  });

  describe('modifyWhitelist', () => {
    it('is only callable by multiSigManager', async () => {
      await expect(users[0].proShop.modifyWhitelist([], [])).to.be.revertedWith('Sender not permitted');
      await expect(multiSigAccount.proShop.modifyWhitelist([], [])).to.not.be.reverted;
    });

    it('sets specified whitelist state of all accounts', async () => {
      await multiSigAccount.proShop.modifyWhitelist([users[0].address, users[1].address, users[2].address], [true, false, true]);
      await multiSigAccount.proShop.toggleWhitelist();
      await expect(users[0].proShop.purchaseMemberCard(0, { value: toWei('.05') })).to.not.be.reverted;
      await expect(users[1].proShop.purchaseMemberCard(0, { value: toWei('.05') })).to.be.revertedWith('Sender is not whitelisted');
      await expect(users[2].proShop.purchaseMemberCard(0, { value: toWei('.05') })).to.not.be.reverted;
    });
  });

  describe('withdrawAll', () => {
    beforeEach(async () => {
      await users[0].proShop.purchaseMemberCard(0, { value: toWei('.25') });
    });
    
    it('is only callable by multiSigManager', async () => {
      await expect(users[0].proShop.modifyWhitelist([], [])).to.be.revertedWith('Sender not permitted');
      await expect(multiSigAccount.proShop.withdrawAll()).to.not.be.reverted;
    });

    it('sends all mint funds to multiSigManager', async () => {
      await expect(() => multiSigAccount.proShop.withdrawAll()).to.changeEtherBalance(multiSigAccount.signer, toWei('.25'));
    });
  });
});
