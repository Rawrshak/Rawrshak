// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

struct Item
{
    uint256 _uuid;
    string _url;
    uint256 _totalSupply;
    address payable _creatorAddress;
    mapping(address => uint) _balances;
}

contract GameContract is ERC1155, AccessControl
{
    /******** Stored Variables ********/
    // This is the address where transactions are sent to.
    address payable private GamePayableAddress;

    /******** Events ********/
    event GamePayableAddressChanged(address);

    /******** Roles ********/
    bytes32 public constant GAME_OWNER_ROLE = keccak256("GAME_OWNER_ROLE");
    // These addresses should probably belong to the server api that the game and 
    // developer app interfaces with.
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    // url: "https://game.example/api/item/{id}.json"
    constructor(string memory url) public ERC1155(url)
    {
        // Contract Deployer is now the owner and can set roles
        GamePayableAddress = msg.sender;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(GAME_OWNER_ROLE, msg.sender);
    }

    // GamePayableAddress getter
    function getGamePayableAddress() public view returns(address payable)
    {
        return GamePayableAddress;
    }

    // GamePayableAddress setter
    function setGamePayableAddress(address payable newAddress) public
    {
        require(hasRole(GAME_OWNER_ROLE, msg.sender), "User does not have the necessary permissions.");
        GamePayableAddress = newAddress;
        emit GamePayableAddressChanged(newAddress);
    }

    // Todo: Add/remove items
    // Todo: mint and burn items
    // Todo: Query Items
}