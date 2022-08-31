/**
* @type import('hardhat/config').HardhatUserConfig
*/
require('dotenv/config');
require('@nomiclabs/hardhat-waffle');
require('hardhat-deploy');
require('hardhat-contract-sizer');
require('hardhat-deploy-ethers');

const { DEV_DEPLOYER_KEY, PROD_DEPLOYER_KEY, DEV_API_URL, PROD_API_URL, DEV_MULTI_SIG_ADDRESS } = process.env;

module.exports = {
  solidity: {
    version: "0.8.7",
    settings: {
      optimizer: {
        enabled: true
      },
      viaIR: true
    }
  },
  networks: {
    hardhat: {
      forking: {
        url: PROD_API_URL
      },
      chainId: 1, // mimick mainnet
      multiSigAddress: DEV_MULTI_SIG_ADDRESS
    },
    goerli: {
      url: DEV_API_URL,
      accounts: [`0x${DEV_DEPLOYER_KEY}`],
      multiSigAddress: DEV_MULTI_SIG_ADDRESS
    },
    mainnet: {
      url: PROD_API_URL,
      accounts: [`0x${PROD_DEPLOYER_KEY}`]
    }
  },
  namedAccounts: {
    deployer: 0
  }
}
