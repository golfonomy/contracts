const Web3 = require('web3');
const utils = Web3.utils;

async function deployFunc({
  deployments,
  getNamedAccounts,
  network: { config: networkConfig }
}) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const baseArgs = {
    from: deployer,
    log: true
  }

  const RewardDispenser = {};
  const ProShop = {};

  tempAddress = networkConfig.multiSigAddress;

  const Birdie = await deploy('Birdie', {
    ...baseArgs,
    args: [
      [], // default operators
      RewardDispenser.address || tempAddress,
      ProShop.address || tempAddress,
      networkConfig.multiSigAddress,
      utils.toWei('1000000') // initial supply
    ]
  });
}

deployFunc.tags = ['main']; // tag for tests
module.exports = deployFunc;
