const { expect } = require('./chai-setup');
const { setupUsers, impersonateAccount, Roles } = require('./utils');
const { ethers, deployments, getNamedAccounts, getUnnamedAccounts, network } = require('hardhat');

let deployer;
let memberCard;
let users;
let multiSigAccount;

describe('MemberCard', () => {
  beforeEach(async () => {
    await deployments.fixture(['main']);
    deployer = (await getNamedAccounts()).deployer;
    memberCard = await ethers.getContract('MemberCard');
    users = await setupUsers((await getUnnamedAccounts()), { memberCard });
    multiSigAccount = await impersonateAccount(network.config.multiSigAddress, users[0].address, { memberCard });
  });

  it('deploys with correct info', async () => {
    expect(await memberCard.name()).to.eq('MemberCard');
    expect(await memberCard.symbol()).to.eq('MBR');
    expect(await memberCard.hasRole(Roles.defaultAdmin, multiSigAccount.address)).to.eq(true);
    expect(await memberCard.hasRole(Roles.defaultAdmin, deployer)).to.eq(false);
  });

  describe('mint', () => {
    beforeEach(async () => {
      await multiSigAccount.memberCard.grantRole(Roles.minter, users[0].address);
    });

    it('requires sender to have minter role', async () => {
      await expect(multiSigAccount.memberCard.mint(multiSigAccount.address)).to.be.reverted;
      await expect(users[0].memberCard.mint(users[1].address)).to.not.be.reverted;
    });

    it('mints new token to address', async () => {
      await users[0].memberCard.mint(users[1].address);
      expect(await memberCard.balanceOf(users[1].address)).to.eq(1);
      expect(await memberCard.ownerOf(0)).to.eq(users[1].address);
    });
  });

  describe('tokenURI', () => {
    beforeEach(async () => {
      await multiSigAccount.memberCard.grantRole(Roles.minter, users[0].address);
      await users[0].memberCard.mint(users[1].address);
    });

    it('requires token to be minted', async () => {
      await expect(memberCard.tokenURI(1)).to.be.revertedWith('ERC721: invalid token ID');
      await expect(memberCard.tokenURI(0)).to.not.be.reverted;
    });

    it('returns URI containing baseTokenURI, and tokenId', async () => {
      expect(await memberCard.tokenURI(0)).to.eq('https://testing.com/0');
    });

    context('when baseTokenURI is empty', () => {
      it('returns blank string', async () => {
        await multiSigAccount.memberCard.setBaseURI('');
        expect(await memberCard.tokenURI(0)).to.eq('');
      });
    });
  });

  describe('setBaseURI', () => {
    beforeEach(async () => {
      await multiSigAccount.memberCard.grantRole(Roles.minter, users[0].address);
      await users[0].memberCard.mint(users[1].address);
    });

    it('requires sender to have defaultAdmin role', async () => {
      await expect(memberCard.setBaseURI('https://newURI.com/')).to.be.reverted;
      await expect(multiSigAccount.memberCard.setBaseURI('https://newURI.com/')).to.not.be.reverted;
    });

    it('sets baseTokenURI to the new URI', async () => {
      await multiSigAccount.memberCard.setBaseURI('https://newURI.com/');
      expect(await memberCard.tokenURI(0)).to.eq('https://newURI.com/0');
    });

    it('emits an UpdatedBaseURI event', async () => {
      let timestamp = Math.round(new Date() / 1000);
      await ethers.provider.send("evm_setNextBlockTimestamp", [timestamp])
      await expect(multiSigAccount.memberCard.setBaseURI('https://newURI.com/')).to.emit(memberCard, "UpdatedBaseURI").withArgs('https://newURI.com/', timestamp);
    });
  });
});