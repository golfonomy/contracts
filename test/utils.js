const { ethers } = require('hardhat');
const { signERC2612Permit } = require('eth-permit');
const Web3 = require('web3');

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

async function signPermit(owner, spender, amount, contract) {
  const { r, s, v, value, deadline } = await signERC2612Permit(
    ethers.provider,
    contract,
    owner,
    spender,
    amount
  );

  return [owner, spender, value, deadline, v, r, s];
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

module.exports = {
  setupUsers,
  setupUser,
  signPermit,
  impersonateAccount,
  toWei: Web3.utils.toWei
}
