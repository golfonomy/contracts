const Web3 = require('web3');

async function deployFunc({deployments, getNamedAccounts}) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const baseArgs = {
    from: deployer,
    log: true    
  }

  const Birdie = await deploy('Birdie', {
    ...baseArgs,
    args: [[]]
  });
}

deployFunc.tags = ['main']; // tag for tests
module.exports = deployFunc;
