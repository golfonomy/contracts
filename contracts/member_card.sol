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

  constructor (address _multiSigManager, string[] memory _initialTypes, string memory _baseURI) {
    _typeNames = _initialTypes;
    _baseTokenURI = _baseURI;
    _setupRole(DEFAULT_ADMIN_ROLE, _multiSigManager);
    _setupRole(DEFAULT_ADMIN_ROLE, msg.sender); // revoked immediately after deployment has finished
  }

  function mint(address _to, uint32 _type) external onlyRole(MINTER_ROLE) returns(uint tokenId) {
    require(_type < _typeNames.length, 'Invalid token type');

    tokenId = _tokenIdCounter.current();
    _tokenIdCounter.increment();
    _safeMint(_to, tokenId);
    _types[tokenId] = _type;
  }

  /*** TOKEN INFO FUNCTIONS ***/

  function typeOf(uint _tokenId) public view returns(uint32 tokenType, string memory typeName) {
    _requireMinted(_tokenId);

    tokenType = _types[_tokenId];
    typeName = _typeNames[tokenType];
  }

  function tokenURI(uint256 _tokenId) public view override returns (string memory) {
    _requireMinted(_tokenId);

    if (bytes(_baseTokenURI).length == 0) {
      return "";
    }

    (, string memory tokenTypeName) = typeOf(_tokenId);
    return string(abi.encodePacked(_baseTokenURI, tokenTypeName, "/", Strings.toString(_tokenId)));
  }

  /*** ADMIN FUNCTIONS ***/

  function setBaseURI(string memory _newURI) external onlyRole(DEFAULT_ADMIN_ROLE) {
    _baseTokenURI = _newURI;
    emit UpdatedBaseURI(_newURI, block.timestamp);
  }

  function createType(string memory _newTypeName) external onlyRole(DEFAULT_ADMIN_ROLE) {
    _typeNames.push(_newTypeName);
    emit CreatedType(_typeNames.length - 1, block.timestamp);
  }

  // override clashing inherited function
  function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, AccessControl) returns(bool) {
    return super.supportsInterface(interfaceId);
  }
}