// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IMemberCard {
  function mint(address to) external returns(uint tokenId);
}
