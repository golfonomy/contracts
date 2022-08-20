 // SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract MemberCard is ERC721("MemberCard", "MBR"), AccessControl {
  using Counters for Counters.Counter;

  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
  Counters.Counter private _tokenIdCounter;
  string private _baseTokenURI;

  // mapping of tokenId to type
  mapping(uint => uint32) private _types;

  // mapping of type to name
  string[] private _typeNames;

  event UpdatedBaseURI(string newBaseURI, uint timestamp);
  event CreatedType(uint indexed typeIndex, uint timestamp);

  constructor (address multiSigManager, string[] memory initialTypes, string memory baseURI) {
    _typeNames = initialTypes;
    _baseTokenURI = baseURI;
    _setupRole(DEFAULT_ADMIN_ROLE, multiSigManager);
    _setupRole(DEFAULT_ADMIN_ROLE, msg.sender); // revoked immediately after deployment has finished
  }

  function mint(address to, uint32 tokenType) external onlyRole(MINTER_ROLE) returns(uint tokenId) {
    require(tokenType < _typeNames.length, 'Invalid token type');

    tokenId = _tokenIdCounter.current();
    _tokenIdCounter.increment();
    _types[tokenId] = tokenType;
    _safeMint(to, tokenId);
  }

  /*** TOKEN INFO FUNCTIONS ***/

  function typeOf(uint tokenId) public view returns(uint32 tokenType, string memory typeName) {
    _requireMinted(tokenId);

    tokenType = _types[tokenId];
    typeName = _typeNames[tokenType];
  }

  function tokenURI(uint256 tokenId) public view override returns (string memory) {
    _requireMinted(tokenId);

    if (bytes(_baseTokenURI).length == 0) {
      return "";
    }

    (, string memory tokenTypeName) = typeOf(tokenId);
    return string(abi.encodePacked(_baseTokenURI, tokenTypeName, "/", Strings.toString(tokenId)));
  }

  /*** ADMIN FUNCTIONS ***/

  function setBaseURI(string memory newURI) external onlyRole(DEFAULT_ADMIN_ROLE) {
    _baseTokenURI = newURI;
    emit UpdatedBaseURI(newURI, block.timestamp);
  }

  function createType(string memory newTypeName) external onlyRole(DEFAULT_ADMIN_ROLE) {
    _typeNames.push(newTypeName);
    emit CreatedType(_typeNames.length - 1, block.timestamp);
  }

  // override clashing inherited function
  function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, AccessControl) returns(bool) {
    return super.supportsInterface(interfaceId);
  }
}