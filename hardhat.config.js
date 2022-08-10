/**
* @type import('hardhat/config').HardhatUserConfig
*/
require('dotenv/config');
require("@nomiclabs/hardhat-ethers");
require('hardhat-deploy');
require('hardhat-contract-sizer');
require('hardhat-deploy-ethers');

const { DEV_DEPLOYER_KEY, PROD_DEPLOYER_KEY, DEV_API_URL, PROD_API_URL } = process.env;

module.exports = {
  solidity: {
    version: "0.8.16",
    settings: {
      optimizer: {
        enabled: true
      }
    }
  },
  networks: {
    hardhat: {
      forking: {
        url: PROD_API_URL
      },
      chainId: 1, // mimick mainnet
      multiSigAddress: '0x2fEdE9b23513493CdB69c40739da868088D5313d'
    },
    goerli: {
      url: DEV_API_URL,
      accounts: [`0x${DEV_DEPLOYER_KEY}`],
      multiSigAddress: '0x2fEdE9b23513493CdB69c40739da868088D5313d'
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
