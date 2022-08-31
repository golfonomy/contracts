// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/introspection/IERC1820Registry.sol";
import "./IMemberCard.sol";

contract ProShop {
  bool public paused;
  bool public whitelist;

  CardType[] private _cardTypes;
  mapping(address => bool) private _whitelistedAccounts;
  mapping(address => mapping(uint32 => uint32)) private _purchaseCounts;

  address payable private immutable _multiSigManager;
  IMemberCard private immutable _memberCard;

  event PurchasedCard(uint32 indexed typeIndex, string cardType, uint price);
  event CreatedType(uint indexed typeIndex, uint timestamp);
  event UpdatedType(uint32 indexed typeIndex, uint timestamp);
  event BalanceWithdrawl(uint balance, uint timestamp);

  struct CardType {
    uint price;
    uint supply;
    uint supplyLimit;
    uint32 purchaseLimit;
    string name;
  }

  modifier only(address permittedAccount) {
    require(msg.sender == permittedAccount, "Sender not permitted");
    _;
  }

  constructor(address payable multiSigManager, address memberCard, CardType[] memory initialTypes) {
    require(multiSigManager != address(0), "multiSigManager cannot be address 0");

    for(uint8 i = 0; i < initialTypes.length; i++) {
      _cardTypes.push(initialTypes[i]);
    }

    _multiSigManager = multiSigManager;
    _memberCard = IMemberCard(memberCard);
  }

  /*** USER FUNCTIONS ***/

  function purchaseMemberCard(uint32 typeIndex) external payable {
    require(!paused, "Pro Shop is paused");
    if (whitelist) { require(_whitelistedAccounts[msg.sender], "Sender is not whitelisted"); }
    require(typeIndex < _cardTypes.length, "Invalid card type");

    CardType storage cardType = _cardTypes[typeIndex];
    require(cardType.supply < cardType.supplyLimit, "Supply limit reached for card type");
    require(_purchaseCounts[msg.sender][typeIndex] < cardType.purchaseLimit, "Account has reached purchase limit");
    require(msg.value >= cardType.price, "Insufficient value");

    cardType.supply += 1;
    _purchaseCounts[msg.sender][typeIndex] += 1;
    emit PurchasedCard(typeIndex, cardType.name, cardType.price);
    _memberCard.mint(msg.sender);
  }

  /*** ADMIN FUNCTIONS ***/

  function createType(CardType memory newType) external only(_multiSigManager) {
    _cardTypes.push(newType);
    emit CreatedType(_cardTypes.length - 1, block.timestamp);
  }

  function updateType(uint32 typeIndex, CardType memory newType) external only(_multiSigManager) {
    _cardTypes[typeIndex] = newType;
    emit UpdatedType(typeIndex, block.timestamp);
  }

  function togglePause() external only(_multiSigManager) {
    paused = !paused;
  }

  function toggleWhitelist() external only(_multiSigManager) {
    whitelist = !whitelist;
  }

  function modifyWhitelist(address[] memory accounts, bool[] memory desiredStates) external only(_multiSigManager) {
    require(accounts.length == desiredStates.length, "accounts and desiredStates must have equal length");
    
    for(uint32 i = 0; i < accounts.length; i++) {
      _whitelistedAccounts[accounts[i]] = desiredStates[i];
    }
  }

  function withdrawAll() external only(_multiSigManager) {
    uint balance = address(this).balance;
    require(balance > 0);

    emit BalanceWithdrawl(balance, block.timestamp);

    (bool success, ) = _multiSigManager.call{value: balance}("");
    require(success, "Withdraw failed");
  }
}
