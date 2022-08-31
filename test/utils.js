const { ethers, getChainId } = require('hardhat');
const { signERC2612Permit } = require('eth-permit');
const Web3 = require('web3');
const { signTypedData, SignTypedDataVersion } = require('@metamask/eth-sig-util');
const { fromRpcSig } = require('ethereumjs-util');

const utils = Web3.utils;
const HARDHAT_USER0_PRIVATE_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
const EIP712Domain = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "address" },
];

const Roles = {
  minter: utils.keccak256("MINTER_ROLE"),
  burner: utils.keccak256("BURNER_ROLE"),
  defaultAdmin: utils.padLeft('0x00', 64)
}

async function setupUsers(addresses, contracts) {
  const users = [];
  for (const address of addresses) {
    users.push(await setupUser(address, contracts));
  }
  return users;
}

async function setupUser(address, contracts) {
  const user = { address };
  for (const key of Object.keys(contracts)) {
    user.signer = await ethers.getSigner(address);
    user[key] = contracts[key].connect(user.signer);
  }
  return user;
}

async function grantBalance(address, faucet, amount) {
  const faucetSigner = await ethers.getSigner(faucet);
  await faucetSigner.sendTransaction({
    to: address,
    value: amount
  });
}

async function impersonateAccount(address, faucet, contracts) {  
  if((await ethers.provider.getBalance(address)).lt(.001 * 10**18)) {
    await grantBalance(address, faucet, `${1 * 10**18}`);
  }
  
  await ethers.provider.send(
    'hardhat_impersonateAccount',
    [address]
  );

  return setupUser(address, contracts);
}

async function claimSignature(recipient, amount, contract, deadline, nonce) {
  const web3 = new Web3(ethers.provider);

  const message = {
    recipient,
    amount,
    nonce: nonce || (await contract.nonces(recipient)).toString(),
    deadline: deadline || Math.round(new Date() / 1000) + 600
  };

  let name = 'RewardClaim';
  let chainId = await getChainId();
  let domain = { name, version: '1', chainId, verifyingContract: contract.address };

  let typedData = {
    types: {
      EIP712Domain,
      Claim: [
        { name: "recipient", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" }
      ]
    },
    primaryType: 'Claim',
    domain,
    message
  }

  // const EIP712Prefix = '0x1901';
  // const CLAIM_TYPE_HASH = Web3.utils.keccak256("Claim(address recipient,uint256 amount,uint256 nonce,uint256 deadline)");

  // let hashStruct = web3.utils.sha3(
  //   web3.eth.abi.encodeParameters(
  //     ['bytes32', 'address', 'uint256', 'uint256', 'uint256'],
  //     [CLAIM_TYPE_HASH, recipient, amount, message.nonce, message.deadline]
  //   )
  // );

  // let domainSeparator = web3.utils.sha3(
  //   web3.eth.abi.encodeParameters(
  //     ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
  //     [
  //       Web3.utils.keccak256('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'),
  //       Web3.utils.keccak256('RewardClaim'),
  //       Web3.utils.keccak256('1'),
  //       chainId,
  //       contract.address
  //     ]
  //   )    
  // );

  // let encodedData = web3.utils.soliditySha3(EIP712Prefix, domainSeparator, hashStruct);
  // let { v, r, s } = await web3.eth.accounts.sign(encodedData, HARDHAT_USER0_PRIVATE_KEY, true);

  let signature = signTypedData({
    data: typedData,
    version: SignTypedDataVersion.V4,
    privateKey: utils.hexToBytes(HARDHAT_USER0_PRIVATE_KEY)
  });

  let { v, r, s } = fromRpcSig(signature);

  return [recipient, amount, message.deadline, v, r, s];
}

module.exports = {
  setupUsers,
  setupUser,
  impersonateAccount,
  claimSignature,
  Roles,
  toWei: Web3.utils.toWei
}
