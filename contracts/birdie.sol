// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC777/ERC777.sol";

contract Birdie is ERC777 {
    constructor(address[] memory defaultOperators)
        ERC777("Birdie", "BRD", defaultOperators) {}
}
