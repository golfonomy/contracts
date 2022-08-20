const Web3 = require('web3');
const utils = Web3.utils;

const MINTER_ROLE = utils.keccak256("MINTER_ROLE");
const BURNER_ROLE = utils.keccak256("BURNER_ROLE");
const DEFAULT_ADMIN_ROLE = utils.padLeft('0x00', 64);

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

  const Birdie = await deploy('Birdie', {
    ...baseArgs,
    args: [
      networkConfig.multiSigAddress,
      utils.toWei('1000000') // initial supply
    ]
  });

  const MemberCard = await deploy('MemberCard', {
    ...baseArgs,
    args: [
      networkConfig.multiSigAddress,
      ['testType'], // TOOD: set intial types and baseURI
      "https://testing.com/"
    ]
  });

  const RewardClaim = await deploy('RewardClaim', {
    ...baseArgs,
    args: [
      networkConfig.multiSigAddress,
      deployer,
      Birdie.address
    ]
  });

  await deployments.execute(
    'Birdie',
    baseArgs,
    'grantRole',
    MINTER_ROLE,
    RewardClaim.address
  );

  await deployments.execute(
    'Birdie',
    baseArgs,
    'renounceRole',
    DEFAULT_ADMIN_ROLE,
    deployer
  );

  await deployments.execute(
    'MemberCard',
    baseArgs,
    'renounceRole',
    DEFAULT_ADMIN_ROLE,
    deployer
  );
}

deployFunc.tags = ['main']; // tag for tests
module.exports = deployFunc;
