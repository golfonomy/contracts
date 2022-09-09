 // SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./IMemberCard.sol";

contract MemberCard is ERC721("MemberCard", "MBR"), ERC721Enumerable, AccessControl, IMemberCard {
  using Counters for Counters.Counter;

  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
  Counters.Counter private _tokenIdCounter;
  string private _baseTokenURI;

  event UpdatedBaseURI(string newBaseURI, uint timestamp);

  constructor (address multiSigManager, string memory baseURI) {
    _baseTokenURI = baseURI;
    _setupRole(DEFAULT_ADMIN_ROLE, multiSigManager);
    _setupRole(DEFAULT_ADMIN_ROLE, msg.sender); // revoked immediately after deployment has finished
  }

  function mint(address to) external override onlyRole(MINTER_ROLE) returns(uint tokenId) {
    tokenId = _tokenIdCounter.current();
    _tokenIdCounter.increment();
    _safeMint(to, tokenId);
  }

  /*** TOKEN INFO FUNCTIONS ***/

  function _baseURI() internal view override returns (string memory) {
    return _baseTokenURI;
  }

  /*** ADMIN FUNCTIONS ***/

  function setBaseURI(string memory newURI) external onlyRole(DEFAULT_ADMIN_ROLE) {
    _baseTokenURI = newURI;
    emit UpdatedBaseURI(newURI, block.timestamp);
  }

  // override clashing inherited functions required by solidity

  function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal override(ERC721, ERC721Enumerable) {
    super._beforeTokenTransfer(from, to, tokenId);
  }

  function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, ERC721Enumerable, AccessControl) returns(bool) {
    return super.supportsInterface(interfaceId);
  }
}
