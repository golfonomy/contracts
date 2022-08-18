 // SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

interface IBirdie {
  function dispense(address, uint, bytes memory, bytes memory) external;
}

// Signature verification is based on ERC20Permit (EIP-2612 and EIP-712)

contract RewardClaim is EIP712("RewardClaim", "1") {
  bool public paused;
  address private serviceAccount;
  address private immutable multiSigManager;
  IBirdie private immutable birdie;

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

  constructor(address _multiSigManager, address _serviceAccount, address _birdie) {
    multiSigManager = _multiSigManager;
    serviceAccount = _serviceAccount;
    paused = false;
    birdie = IBirdie(_birdie);
  }

  /*** USER FUNCTIONS ***/

  function claim(ClaimSignature memory _claimSignature) external {
    require(!paused, "Reward claiming is paused");
    require(msg.sender != serviceAccount, "Service account not allowed to claim");

    verifySignature(_claimSignature);
    require(msg.sender == _claimSignature.recipient, "Sender is not the intended recipient");

    birdie.dispense(msg.sender, _claimSignature.amount, "", "");
  }

  /*** ADMIN FUNCTIONS ***/

  function rotateServiceAccount(address _newAccount) external {
    require(msg.sender == serviceAccount || msg.sender == multiSigManager, "Sender not permitted");
    serviceAccount = _newAccount;
  }

  function togglePause() external {
    require(msg.sender == multiSigManager, "Sender not permitted");
    paused = !paused;
  }

  /*** UTILITY FUNCTIONS ***/

  function verifySignature(ClaimSignature memory _claimSignature) private {
    require(block.timestamp <= _claimSignature.deadline, "Expired claim deadline");

    uint nonce = consumeNonce(_claimSignature.recipient);
    bytes32 structHash = keccak256(abi.encode(
      CLAIM_TYPEHASH,
      _claimSignature.recipient,
      _claimSignature.amount,
      nonce,
      _claimSignature.deadline
    ));

    address signer = ECDSA.recover(
      _hashTypedDataV4(structHash),
      _claimSignature.v,
      _claimSignature.r,
      _claimSignature.s
    );

    require(signer == serviceAccount, "Invalid claim signature");
  }
  
  function consumeNonce(address recipient) private returns (uint current) {
    current = nonces[recipient];
    nonces[recipient] += 1;
  }
}
