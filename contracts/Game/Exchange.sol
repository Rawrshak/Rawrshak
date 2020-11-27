// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "../interfaces/IGlobalItemRegistry.sol";
import "../interfaces/IExchange.sol";
import "../utils/ExtendedEnumerableMaps.sol";
import "./ExchangeEscrow.sol";

// Todo: Add multiple bids/asks per user
// Todo: Allow both bid and ask at the same time (but not for the same price)

contract Exchange is IExchange {
    using ERC165Checker for *;
    using SafeMath for *;
    using EnumerableSet for *;
    using ExtendedEnumerableMaps for *;

    /******** Constants ********/
    bytes4 private constant _INTERFACE_ID_IGLOBALITEMREGISTRY = 0x18028f85;
    
    /******** Data Structures ********/
    struct Item {
        ExtendedEnumerableMaps.AddressToUintMap bids;
        ExtendedEnumerableMaps.AddressToUintMap asks;
    }

    struct Data {
        address user;
        address token;
        uint256 itemUUID;
		uint price;
        uint amount;
        bool isBid;
    }

    /******** Stored Variables ********/
    address globalItemRegistryAddr;
    mapping(uint256 => Item) items;
    mapping(address => EnumerableSet.UintSet) userData;
    mapping(uint256 => Data) data;
    address escrowAddr;

    /******** Events ********/
    event BidPlaced(uint256);
    event AskPlaced(uint256);
    event OrderFilled(uint256);
    event DataEntryDeleted(uint256);
    event OrderFullfilled(uint256);
    event Claimed(uint256);

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
        require(items[_uuid].asks.contains(_user), "Existing item bid and ask from user");

        // This will throw if _token address doesn't support the necessary
        escrow().addToken(_token);

        // Will throw if user does not have enough tokens
        IERC20(_token).transferFrom(_user, escrowAddr, SafeMath.mul(_amount, _price));

        uint256 dataId = generateDataId(_user, _token, _uuid);

        // if there's already an existing bid, replace it.
        Data storage dataEntry = data[dataId];
        dataEntry.user = _user;
        dataEntry.token = _token;
        dataEntry.itemUUID = _uuid;
        dataEntry.price = _price;
        dataEntry.amount = _amount;
        dataEntry.isBid = true;

        // replaces item if it already exists in the map
        items[_uuid].bids.set(_user, dataId);

        // No-op if it already exists
        userData[_user].add(dataId);

        emit BidPlaced(dataId);
    }

    function placeAsk(address _user, address _token, uint256 _uuid, uint256 _amount, uint256 _price) 
        external
        override
    {
        require(items[_uuid].bids.contains(_user), "Existing item bid and ask from user");

        // This will throw if _token address doesn't support the necessary
        escrow().addToken(_token);

        // Get game information
        (address gameAddr, uint256 gameId) = globalItemRegistry().getItemInfo(_uuid);

        // Will throw if user's balanace of the id is not enough
        IERC1155(gameAddr).safeTransferFrom(_user, escrowAddr, gameId, _amount, "");
        
        uint256 dataId = generateDataId(_user, _token, _uuid);

        Data storage dataEntry = data[dataId];
        dataEntry.user = _user;
        dataEntry.token = _token;
        dataEntry.itemUUID = _uuid;
        dataEntry.price = _price;
        dataEntry.amount = _amount;
        dataEntry.isBid = false;

        // replaces item if it already exists in the map
        items[_uuid].bids.set(_user, dataId);
        
        // No-op if it already exists
        userData[_user].add(dataId);

        emit AskPlaced(dataId);
    }

    function deleteDataEntry(uint256 _dataId) external override {
        _deleteData(_dataId);
        emit DataEntryDeleted(_dataId);
    }

    function getUserOrders(address _user)
        external
        view
        override
        returns(uint256[] memory orders)
    {
        orders = new uint256[](userData[_user].length());
        for (uint256 i = 0; i < orders.length; ++i) {
            orders[i] = userData[_user].at(i);
        }
    }

    function getItemData(uint256 _uuid)
        external
        view
        override
        returns(uint256[] memory bidIds, uint256[] memory askIds)
    {
        bidIds = new uint256[](items[_uuid].bids.length());
        for (uint256 i = 0; i < bidIds.length; ++i) {
            (, bidIds[i]) = items[_uuid].bids.at(i);
        }

        askIds = new uint256[](items[_uuid].asks.length());
        for (uint256 i = 0; i < askIds.length; ++i) {
            (, askIds[i]) = items[_uuid].asks.at(i);
        }
    }

    function getDataEntry(uint256 _dataId)
        external
        view
        override
        returns(address _user, address _token, uint256 _uuid, uint256 _amount, uint256 _price, bool isBid)
    {
        return (
            data[_dataId].user,
            data[_dataId].token,
            data[_dataId].itemUUID,
            data[_dataId].price,    
            data[_dataId].amount,
            data[_dataId].isBid
        );
    }

    function fullfillOrder(uint256 _dataId) external override {
        // This will fail if _token address doesn't support the necessary
        Data storage dataEntry = data[_dataId];
        address sellerAddr;
        address buyerAddr;

        if (dataEntry.isBid) {
            sellerAddr = msg.sender;
            buyerAddr = escrowAddr;
        } else {
            sellerAddr = escrowAddr;
            buyerAddr = msg.sender;
        }
        
        // Will fail if user does not have enough tokens
        IERC20(dataEntry.token).transferFrom(
            buyerAddr,
            sellerAddr,
            SafeMath.mul(dataEntry.amount, dataEntry.price)
        );

        // Get game information
        (address gameAddr, uint256 gameId) = globalItemRegistry().getItemInfo(dataEntry.itemUUID);

        // Will fail if escrow's balanace of the id is not enough
        IERC1155(gameAddr).safeTransferFrom(sellerAddr, buyerAddr, gameId, dataEntry.amount, "");

        emit OrderFullfilled(_dataId);
    }

    function claim(uint256 _dataId) external override {
        require(msg.sender == data[_dataId].user, "Invalid user claim");
        
        Data storage dataEntry = data[_dataId];

        if (data[_dataId].isBid) {
            // Get game information
            (address gameAddr, uint256 gameId) = globalItemRegistry().getItemInfo(dataEntry.itemUUID);

            // Will fail if escrow's balanace of the id is not enough
            IERC1155(gameAddr).safeTransferFrom(escrowAddr, msg.sender, gameId, dataEntry.amount, "");
        } else {
            IERC20(dataEntry.token).transferFrom(
                escrowAddr,
                msg.sender,
                SafeMath.mul(dataEntry.amount, dataEntry.price)
            );
        }

        _deleteData(_dataId);
        emit Claimed(_dataId);
    }

    /******** Internal Functions ********/
    function _deleteData(uint256 _dataId) internal {
        // delete from userdata->dataId map
        Data storage dataEntry = data[_dataId];
        userData[dataEntry.user].remove(_dataId);

        // delete from item ask/bids map
        items[dataEntry.itemUUID].asks.remove(dataEntry.user);
        items[dataEntry.itemUUID].bids.remove(dataEntry.user);

        // delete stored data
        delete data[_dataId];
    }

    function globalItemRegistry() internal view returns (IGlobalItemRegistry) {
        return IGlobalItemRegistry(globalItemRegistryAddr);
    }
    
    function escrow() internal view returns(ExchangeEscrow) {
        return ExchangeEscrow(escrowAddr);
    }
    
    function generateDataId(
        address _user,
        address _token,
        uint256 _uuid
    )
        internal
        pure
        returns(uint256)
    {
        return uint256(keccak256(abi.encodePacked(_user, _token, _uuid)));
    }
}