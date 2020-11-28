// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/introspection/ERC165.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "../interfaces/IGlobalItemRegistry.sol";
import "../interfaces/IExchange.sol";
import "../utils/ExtendedEnumerableMaps.sol";
import "./ExchangeEscrow.sol";

// Todo: Add multiple bids/asks per user
// Todo: Allow both bid and ask at the same time (but not for the same price)
// Todo: Add Claim all function

contract Exchange is IExchange, ERC165 {
    using ERC165Checker for *;
    using SafeMath for *;
    using EnumerableSet for *;
    using ExtendedEnumerableMaps for *;

    /******** Constants ********/
    /*
     *     bytes4(keccak256('placeBid(address,address,uint256,uint256,uint256)')) == 0xfcfb8f11
     *     bytes4(keccak256('placeAsk(address,address,uint256,uint256,uint256)')) == 0xee2a36df
     *     bytes4(keccak256('deleteDataEntry(uint256)')) == 0x28a5cb71
     *     bytes4(keccak256('getUserOrders(address)')) == 0x63c69f08
     *     bytes4(keccak256('getItemData(uint256)')) == 0x8bc6976e
     *     bytes4(keccak256('getDataEntry(uint256)')) == 0xf75d8ada
     *     bytes4(keccak256('getClaimable(address)')) == 0xa583024b
     *     bytes4(keccak256('claim(uint256)')) == 0x379607f5
     *     bytes4(keccak256('claimBatch(uint256[])')) == 0x62abebce
     *     bytes4(keccak256('fullfillOrder(uint256)')) == 0xaf9ae92a
     *
     *     => 0xfcfb8f11 ^ 0xee2a36df ^ 0x28a5cb71 ^ 0x63c69f08
     *      ^ 0x8bc6976e ^ 0xf75d8ada ^ 0xa583024b ^ 0x379607f5
     *      ^ 0x62abebce ^ 0xaf9ae92a  == 0x7a0df759
     */
    bytes4 private constant _INTERFACE_ID_IEXCHANGE = 0x7a0df759;
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
        bool isClaimable;
    }

    /******** Stored Variables ********/
    address globalItemRegistryAddr;
    mapping(uint256 => Item) items;
    mapping(address => EnumerableSet.UintSet) userData;
    mapping(uint256 => Data) data;
    mapping(address => EnumerableSet.UintSet) claimableOrders;
    address escrowAddr;

    /******** Events ********/
    event BidPlaced(uint256);
    event AskPlaced(uint256);
    event OrderFilled(uint256);
    event DataEntryDeleted(uint256);
    event OrderFullfilled(uint256);
    event Claimed(uint256);
    event ClaimedBatch(uint256[]);

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
        _registerInterface(_INTERFACE_ID_IEXCHANGE);
    }

    function placeBid(address _user, address _token, uint256 _uuid, uint256 _amount, uint256 _price)
        external
        override
    {
        require(!items[_uuid].asks.contains(_user), "Existing item ask from user");
        require(globalItemRegistry().contains(_uuid), "Item doesn't exist.");

        // This will throw if _token address doesn't support the necessary
        escrow().addToken(_token);

        // Get game address and register on escrow
        (address gameAddr,) = globalItemRegistry().getItemInfo(_uuid);
        escrow().addGame(gameAddr);

        // Will throw if user does not have enough tokens
        IERC20(_token).transferFrom(_user, escrowAddr, SafeMath.mul(_amount, _price));

        uint256 dataId = _generateDataId(_user, _token, _uuid);
        require(!_isClaimable(dataId), "Pending claimable assets.");

        // if there's already an existing bid, replace it.
        Data storage dataEntry = data[dataId];
        dataEntry.user = _user;
        dataEntry.token = _token;
        dataEntry.itemUUID = _uuid;
        dataEntry.price = _price;
        dataEntry.amount = _amount;
        dataEntry.isBid = true;
        dataEntry.isClaimable = false;

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
        require(!items[_uuid].bids.contains(_user), "Existing item bid from user");
        require(globalItemRegistry().contains(_uuid), "Item doesn't exist.");

        // This will throw if _token address doesn't support the necessary
        escrow().addToken(_token);

        // Get game address and register on escrow
        (address gameAddr, uint256 gameId) = globalItemRegistry().getItemInfo(_uuid);
        escrow().addGame(gameAddr);

        // Will throw if user's balanace of the id is not enough
        IERC1155(gameAddr).safeTransferFrom(_user, escrowAddr, gameId, _amount, "");
        
        uint256 dataId = _generateDataId(_user, _token, _uuid);
        require(!_isClaimable(dataId), "Pending claimable assets.");

        Data storage dataEntry = data[dataId];
        dataEntry.user = _user;
        dataEntry.token = _token;
        dataEntry.itemUUID = _uuid;
        dataEntry.price = _price;
        dataEntry.amount = _amount;
        dataEntry.isBid = false;
        dataEntry.isClaimable = false;

        // replaces item if it already exists in the map
        items[_uuid].asks.set(_user, dataId);
        
        // No-op if it already exists
        userData[_user].add(dataId);

        emit AskPlaced(dataId);
    }

    function deleteDataEntry(uint256 _dataId) external override {
        require(!_isClaimable(_dataId), "Can't delete claimable data entry");

        Data storage dataEntry = data[_dataId];
        require(msg.sender == dataEntry.user, "Invalid order delete");

        // Return escrowed items
        if (dataEntry.isBid) {
            // Return user money for their bid
            require(
                escrow().approveToken(
                    dataEntry.token,
                    SafeMath.mul(dataEntry.amount, dataEntry.price)),
                "Token is not supported."
            );
            IERC20(dataEntry.token).transferFrom(
                escrowAddr,
                msg.sender,
                SafeMath.mul(dataEntry.amount, dataEntry.price)
            );
        } else {
            // Return user item
            // Get game information
            (address gameAddr, uint256 gameId) = globalItemRegistry().getItemInfo(dataEntry.itemUUID);

            // Will fail if escrow's balanace of the id is not enough
            IERC1155(gameAddr).safeTransferFrom(escrowAddr, msg.sender, gameId, dataEntry.amount, "");
        }

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
        returns(address _user, address _token, uint256 _uuid, uint256 _amount, uint256 _price, bool isBid, bool isClaimable)
    {
        return (
            data[_dataId].user,
            data[_dataId].token,
            data[_dataId].itemUUID,
            data[_dataId].amount,
            data[_dataId].price,
            data[_dataId].isBid,
            data[_dataId].isClaimable
        );
    }

    function fullfillOrder(uint256 _dataId) external override {
        // This will fail if _token address doesn't support the necessary
        Data storage dataEntry = data[_dataId];
        require(dataEntry.user != msg.sender, "Order owner cannot fullfill order.");
        require(!dataEntry.isClaimable, "Order is already filled.");
        address sellerAddr;
        address buyerAddr;

        // Get game information
        (address gameAddr, uint256 gameId) = globalItemRegistry().getItemInfo(dataEntry.itemUUID);

        if (dataEntry.isBid) {
            sellerAddr = msg.sender;
            buyerAddr = escrowAddr;

            // Approve escrow to move tokens to user
            require(
                escrow().approveToken(
                    dataEntry.token,
                    SafeMath.mul(dataEntry.amount, dataEntry.price)),
                "Token is not supported."
            );
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

        // Will fail if escrow's balanace of the id is not enough
        IERC1155(gameAddr).safeTransferFrom(sellerAddr, buyerAddr, gameId, dataEntry.amount, "");

        // Order is now claimable
        dataEntry.isClaimable = true;
        claimableOrders[dataEntry.user].add(_dataId);

        emit OrderFullfilled(_dataId);
    }

    function getClaimable(address _user) external view override returns(uint256[] memory dataIds) {
        dataIds = new uint256[](claimableOrders[_user].length());
        for (uint256 i = 0; i < claimableOrders[_user].length(); i++) {
            dataIds[i] = claimableOrders[_user].at(i);
        }
    }

    function claim(uint256 _dataId) external override {
        Data storage dataEntry = data[_dataId];
        require(msg.sender == dataEntry.user, "Invalid user claim");        
        
        if (dataEntry.isBid) {
            // Get game information
            (address gameAddr, uint256 gameId) = globalItemRegistry().getItemInfo(dataEntry.itemUUID);
            
            // Will fail if escrow's balanace of the id is not enough
            IERC1155(gameAddr).safeTransferFrom(escrowAddr, msg.sender, gameId, dataEntry.amount, "");
        } else {
            require(
                escrow().approveToken(
                    dataEntry.token,
                    SafeMath.mul(dataEntry.amount, dataEntry.price)),
                "Token is not supported."
            );

            IERC20(dataEntry.token).transferFrom(
                escrowAddr,
                msg.sender,
                SafeMath.mul(dataEntry.amount, dataEntry.price)
            );
        }

        // remove from claimable list
        claimableOrders[dataEntry.user].remove(_dataId);
        
        _deleteData(_dataId);
        emit Claimed(_dataId);
    }

    // Todo: this could be improved by doing batch transfers for items
    function claimBatch(uint256[] calldata _dataIds) external override {
        for (uint256 i = 0; i < _dataIds.length; ++i) {
            Data storage dataEntry = data[_dataIds[i]];
            require(msg.sender == dataEntry.user, "Invalid user claim");

            if (dataEntry.isBid) {
                // Get game information
                (address gameAddr, uint256 gameId) = globalItemRegistry().getItemInfo(dataEntry.itemUUID);

                // Will fail if escrow's balanace of the id is not enough
                IERC1155(gameAddr).safeTransferFrom(escrowAddr, msg.sender, gameId, dataEntry.amount, "");
            } else {
                require(
                    escrow().approveToken(
                        dataEntry.token,
                        SafeMath.mul(dataEntry.amount, dataEntry.price)),
                    "Token is not supported."
                );
                IERC20(dataEntry.token).transferFrom(
                    escrowAddr,
                    msg.sender,
                    SafeMath.mul(dataEntry.amount, dataEntry.price)
                );
            }

            // remove from claimable list
            claimableOrders[dataEntry.user].remove(_dataIds[i]);

            _deleteData(_dataIds[i]);
        }
        emit ClaimedBatch(_dataIds);
    }

    /******** Internal Functions ********/

    function globalItemRegistry() internal view returns (IGlobalItemRegistry) {
        return IGlobalItemRegistry(globalItemRegistryAddr);
    }
    
    function escrow() internal view returns(ExchangeEscrow) {
        return ExchangeEscrow(escrowAddr);
    }

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

    function _isClaimable(uint256 _dataId) internal view returns(bool) {
        return (data[_dataId].user != address(0) && data[_dataId].isClaimable);
    }
    
    function _generateDataId(
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