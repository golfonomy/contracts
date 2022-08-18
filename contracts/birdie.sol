// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC777/ERC777.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract Birdie is ERC777, AccessControl {
  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
  bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

  constructor(
    address _multiSigManager,
    uint _initialSupply
  ) ERC777("Birdie", "BRD", new address[](0))
  {
    _setupRole(DEFAULT_ADMIN_ROLE, _multiSigManager);
    _setupRole(DEFAULT_ADMIN_ROLE, msg.sender); // revoked immediately after deployment has finished
    _mint(_multiSigManager, _initialSupply, "", "", false);
  }

  function dispense(address _account, uint _amount, bytes memory _userData, bytes memory _operatorData) external onlyRole(MINTER_ROLE) {
    _mint(_account, _amount, _userData, _operatorData, false);
  }

  function destroy(address _account, uint _amount, bytes memory _userData, bytes memory _operatorData) external onlyRole(BURNER_ROLE) {
    _burn(_account, _amount, _userData, _operatorData);
  }
}
