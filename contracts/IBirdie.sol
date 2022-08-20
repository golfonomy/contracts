// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IBirdie {
  function dispense(address account, uint amount, bytes memory userData, bytes memory operatorData) external;
  function destroy(address account, uint amount, bytes memory userData, bytes memory operatorData) external;
}
