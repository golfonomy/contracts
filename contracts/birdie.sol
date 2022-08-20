// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC777/ERC777.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./IBirdie.sol";

contract Birdie is ERC777, AccessControl, IBirdie {
  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
  bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

  constructor(
    address multiSigManager,
    uint initialSupply
  ) ERC777("Birdie", "BRD", new address[](0))
  {
    _setupRole(DEFAULT_ADMIN_ROLE, multiSigManager);
    _setupRole(DEFAULT_ADMIN_ROLE, msg.sender); // revoked immediately after deployment has finished
    _mint(multiSigManager, initialSupply, "", "", false);
  }

  function dispense(address account, uint amount, bytes memory userData, bytes memory operatorData) external override onlyRole(MINTER_ROLE) {
    _mint(account, amount, userData, operatorData, false);
  }

  function destroy(address account, uint amount, bytes memory userData, bytes memory operatorData) external override onlyRole(BURNER_ROLE) {
    _burn(account, amount, userData, operatorData);
  }
}
