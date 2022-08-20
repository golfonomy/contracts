 // SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./IBirdie.sol";

// Signature verification is based on ERC20Permit (EIP-2612 and EIP-712)

contract RewardClaim is EIP712("RewardClaim", "1") {
  bool public paused;
  address private _serviceAccount;
  address private immutable _multiSigManager;
  IBirdie private immutable _birdie;

  bytes32 private constant CLAIM_TYPEHASH = keccak256("Claim(address recipient,uint256 amount,uint256 nonce,uint256 deadline)");
  mapping(address => uint) public nonces;

  event RotatedServiceAccount(address indexed newAccount, uint timestamp);

  struct ClaimSignature {
    address recipient;
    uint256 amount;
    uint256 deadline;
    uint8 v;
    bytes32 r;
    bytes32 s;
  }

  constructor(address multiSigManager, address serviceAccount, address birdie) {
    require(multiSigManager != address(0), 'MutliSigManager cannot be 0 address');
    require(serviceAccount != address(0), 'Service account cannot be 0 address');

    _multiSigManager = multiSigManager;
    _serviceAccount = serviceAccount;
    paused = false;
    _birdie = IBirdie(birdie);
  }

  /*** USER FUNCTIONS ***/

  function claim(ClaimSignature memory claimSignature) external {
    require(!paused, "Reward claiming is paused");
    require(msg.sender != _serviceAccount, "Service account not allowed to claim");

    verifySignature(claimSignature);
    require(msg.sender == claimSignature.recipient, "Sender is not the intended recipient");

    _birdie.dispense(msg.sender, claimSignature.amount, "", "");
  }

  /*** ADMIN FUNCTIONS ***/

  function rotateServiceAccount(address newAccount) external {
    require(msg.sender == _serviceAccount || msg.sender == _multiSigManager, "Sender not permitted");
    require(newAccount != address(0), 'New service account cannot be 0 address');

    _serviceAccount = newAccount;
  }

  function togglePause() external {
    require(msg.sender == _multiSigManager, "Sender not permitted");
    paused = !paused;
  }

  /*** UTILITY FUNCTIONS ***/

  function verifySignature(ClaimSignature memory claimSignature) private {
    require(block.timestamp <= claimSignature.deadline, "Expired claim deadline");

    uint nonce = consumeNonce(claimSignature.recipient);
    bytes32 structHash = keccak256(abi.encode(
      CLAIM_TYPEHASH,
      claimSignature.recipient,
      claimSignature.amount,
      nonce,
      claimSignature.deadline
    ));

    address signer = ECDSA.recover(
      _hashTypedDataV4(structHash),
      claimSignature.v,
      claimSignature.r,
      claimSignature.s
    );

    require(signer == _serviceAccount, "Invalid claim signature");
  }
  
  function consumeNonce(address recipient) private returns (uint current) {
    current = nonces[recipient];
    nonces[recipient] += 1;
  }
}
