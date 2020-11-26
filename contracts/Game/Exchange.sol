// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/introspection/ERC165Checker.sol";
import "../interfaces/IGlobalItemRegistry.sol";
import "../interfaces/IExchange.sol";
import "./ExchangeEscrow.sol";

contract Exchange is IExchange {
    using ERC165Checker for *;

    /******** Constants ********/
    bytes4 private constant _INTERFACE_ID_IGLOBALITEMREGISTRY = 0x18028f85;
    
    /******** Data Structures ********/
    struct Item {
        mapping(address => uint256) bids;
        mapping(address => uint256) asks;
    }

    struct Data {
        address user;
		uint price;
        uint amount;
    }

    /******** Stored Variables ********/
    address globalItemRegistryAddr;
    mapping(uint256 => Item) items;
    mapping(address => uint256) userData;
    mapping(uint256 => Data) data;
    address escrowAddr;

    /******** Events ********/
    event BidPlaced(uint256);
    event AskPlaced(uint256);
    event OrderFilled(uint256);

    /******** Modifiers ********/
    modifier checkItemExists(uint256 _uuid) {
        require(globalItemRegistry().contains(_uuid), "Item does not exist.");
        _;
    }

    /******** Public API ********/
    constructor(address _itemRegistryAddr) public {
        require(Address.isContract(_itemRegistryAddr), "Address not valid");
        require(
            ERC165Checker.supportsInterface(_itemRegistryAddr, _INTERFACE_ID_IGLOBALITEMREGISTRY),
            "Caller does not support Interface."
        );
        globalItemRegistryAddr = _itemRegistryAddr;
        escrowAddr = address(new ExchangeEscrow());
    }

    function placeBid(address _user, address _token, uint256 _uuid, uint256 _amount, uint256 _price)
        external
        override
    {
        // Todo:
        emit BidPlaced(generateDataId(_user, _token, _uuid, _amount, _price));
    }

    function placeAsk(address _user, address _token, uint256 _uuid, uint256 _amount, uint256 _price) 
        external
        override
    {
        // Todo:
        emit AskPlaced(generateDataId(_user, _token, _uuid, _amount, _price));
    }

    function getUserData(address _user)
        external
        view
        override
        returns(uint256[] memory bidIds, uint256[] memory askIds)
    {
        // Todo:
    }

    function getItemData(address _user)
        external
        view
        override
        returns(uint256[] memory bidIds, uint256[] memory askIds)
    {
        // Todo:
    }

    function getData(uint256 _dataId)
        external
        view
        override
        returns(address _user, address _token, uint256 _uuid, uint256 _amount, uint256 _price)
    {
        // Todo:
    }

    function fullfillOrder(uint256 _dataId) external override {
        // Todo:
    }

    /******** Internal Functions ********/
    function globalItemRegistry() internal view returns (IGlobalItemRegistry) {
        return IGlobalItemRegistry(globalItemRegistryAddr);
    }
    
    function escrow() internal view returns(ExchangeEscrow) {
        return ExchangeEscrow(escrowAddr);
    }
    
    function generateDataId(
        address _user,
        address _token,
        uint256 _uuid,
        uint256 _amount,
        uint256 _price
    )
        internal
        pure
        returns(uint256)
    {
        return uint256(keccak256(abi.encodePacked(_user, _token, _uuid, _amount, _price)));
    }
}