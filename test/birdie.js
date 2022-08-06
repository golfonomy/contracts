const { expect } = require('./chai-setup');
const { setupUsers } = require('./utils');
const { ethers, deployments, getNamedAccounts, getUnnamedAccounts } = require('hardhat');

let deployer;
let birdie;
let users;

describe('Birdie', () => {
  beforeEach(async () => {
    await deployments.fixture(['main']);
    deployer = (await getNamedAccounts()).deployer;
    birdie = await ethers.getContract('Birdie');
    users = await setupUsers((await getUnnamedAccounts()), { birdie });
  });

  it('deploys with correct info', async () => {
    expect(await birdie.name()).to.eq('Birdie');
    expect(await birdie.symbol()).to.eq('BRD');
    expect(await birdie.decimals()).to.eq(18);
  });

  it('test', async () => {
    console.log('valid:', (await birdie.test_1820('0x1430F4CB9D123F1542d908a29D6987bA05a858e3')));
    console.log('invalid:', (await birdie.test_1820(users[0].address)));
  });
});