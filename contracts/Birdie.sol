// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./IBirdie.sol";

contract Birdie is ERC20("Birdie", "BRD"), AccessControl, IBirdie {
  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
  bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

  event SpendData(address indexed owner, uint amount, bytes data);

  constructor(address multiSigManager, uint initialSupply) {
    _setupRole(DEFAULT_ADMIN_ROLE, multiSigManager);
    _setupRole(DEFAULT_ADMIN_ROLE, msg.sender); // revoked immediately after deployment has finished
    _mint(multiSigManager, initialSupply);
  }

  /*** USER FUNCTIONS ***/

  function spend(uint amount, bytes memory userData) external {
    address owner = msg.sender;
    _burn(owner, amount);
    emit SpendData(owner, amount, userData);
  }

  /*** SERVICE CONTRACT FUNCTIONS ***/

  function dispense(address account, uint amount) external override onlyRole(MINTER_ROLE) {
    _mint(account, amount);
  }

  function destroy(address account, uint amount) external override onlyRole(BURNER_ROLE) {
    _burn(account, amount);
  }
}
