// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Storage.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "../interfaces/IGlobalItemRegistry.sol";
import "../interfaces/IExchange.sol";
import "./ExchangeEscrow.sol";
import "../../utils/Constants.sol";

contract Exchange is IExchange, Ownable, ERC165Storage {
    using ERC165Checker for *;
    using SafeMath for *;
    using EnumerableSet for *;

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
    
    struct Order {
        address user;
        address token;
        uint256 itemUUID;
		uint256 price;
        uint256 amountForSale;
        uint256 amountEscrowed;
        bool isBid;
        bool claimable;
    }

    /******** Stored Variables ********/
    address globalItemRegistryAddr;
    mapping(address => EnumerableSet.UintSet) userOrders;
    mapping(uint256 => Order) orders;
    uint256 orderIdCounter;
    address escrowAddr;

    /******** Events ********/
    event GlobalItemRegistryStored(address, address, bytes4);
    event OrderPlaced(address user, address token, uint256 itemId, uint256 amount, uint256 price, bool isBid, uint256 orderId);
    event OrderDeleted(address owner, uint256 orderId);
    event OrderFilled(uint256 orderId, address user, address orderOwner, uint256 itemId, uint256 amount, uint256 price);
    event Claimed(address owner, uint256 orderId);
    event ClaimedAll(address owner, uint256[] orderIds);

    /******** Modifiers ********/
    modifier checkItemExists(uint256 _uuid) {
        require(globalItemRegistry().contains(_uuid), "Item does not exist.");
        _;
    }

    /******** Public API ********/
    constructor() {
        escrowAddr = address(new ExchangeEscrow());
        _registerInterface(Constants._INTERFACE_ID_IEXCHANGE);
    }

    function setGlobalItemRegistryAddr(address _addr) external override onlyOwner {
        require(Address.isContract(_addr), "Address not valid");
        require(
            ERC165Checker.supportsInterface(_addr, Constants._INTERFACE_ID_IGLOBALITEMREGISTRY),
            "Caller does not support Interface."
        );
        globalItemRegistryAddr = _addr;

        emit GlobalItemRegistryStored(address(this), _addr, Constants._INTERFACE_ID_IEXCHANGE);
    }

    function placeBid(address _user, address _token, uint256 _uuid, uint256 _amount, uint256 _price)
        external
        override
    {
        require(globalItemRegistry().contains(_uuid), "Item doesn't exist.");

        // This will throw if _token address doesn't support the necessary
        escrow().addToken(_token);

        // Will throw if user does not have enough tokens
        IERC20(_token).transferFrom(_user, escrowAddr, SafeMath.mul(_amount, _price));

        // Get game address and register on escrow
        (address gameAddr,,) = globalItemRegistry().getItemInfo(_uuid);
        escrow().addGame(gameAddr);

        uint256 orderId = _generateOrderId(_user, _token, _uuid);

        Order storage order = orders[orderId];
        order.user = _user;
        order.token = _token;
        order.itemUUID = _uuid;
        order.price = _price;
        order.amountForSale = _amount;
        order.amountEscrowed = 0;
        order.isBid = true;
        order.claimable = false;

        userOrders[_user].add(orderId);

        emit OrderPlaced(_user, _token, _uuid, _amount, _price, true, orderId);
    }

    function placeAsk(address _user, address _token, uint256 _uuid, uint256 _amount, uint256 _price) 
        external
        override
    {
        require(globalItemRegistry().contains(_uuid), "Item doesn't exist.");

        // Get game address and register on escrow
        (address gameAddr, , uint256 gameId) = globalItemRegistry().getItemInfo(_uuid);
        escrow().addGame(gameAddr);

        // Will throw if user's balanace of the id is not enough
        IERC1155(gameAddr).safeTransferFrom(_user, escrowAddr, gameId, _amount, "");

        // This will throw if _token address doesn't support the necessary
        escrow().addToken(_token);
        
        uint256 orderId = _generateOrderId(_user, _token, _uuid);

        Order storage order = orders[orderId];
        order.user = _user;
        order.token = _token;
        order.itemUUID = _uuid;
        order.price = _price;
        order.amountForSale = _amount;
        order.amountEscrowed = 0;
        order.isBid = false;
        order.claimable = false;
        
        userOrders[_user].add(orderId);

        emit OrderPlaced(_user, _token, _uuid, _amount, _price, false, orderId);
    }

    function deleteOrder(uint256 _orderId) external override {
        require(!_isClaimable(_orderId), "Can't delete claimable data entry");

        Order storage order = orders[_orderId];
        require(msg.sender == order.user, "Invalid order delete");

        // Return escrowed items
        if (order.isBid) {
            // Return user money for their bid
            require(
                escrow().approveToken(
                    order.token,
                    SafeMath.mul(order.amountForSale, order.price)),
                "Token is not supported."
            );
            IERC20(order.token).transferFrom(
                escrowAddr,
                msg.sender,
                SafeMath.mul(order.amountForSale, order.price)
            );
        } else {
            // Return user item
            // Get game information
            (address gameAddr, , uint256 gameId) = globalItemRegistry().getItemInfo(order.itemUUID);

            // Will fail if escrow's balanace of the id is not enough
            IERC1155(gameAddr).safeTransferFrom(escrowAddr, msg.sender, gameId, order.amountForSale, "");
        }

        _deleteOrder(_orderId);
        emit OrderDeleted(msg.sender, _orderId);
    }

    function getOrder(uint256 _orderId)
        external
        view
        override
        returns(address _user, address _token, uint256 _uuid, uint256 _amount, uint256 _price, bool isBid)
    {
        return (
            orders[_orderId].user,
            orders[_orderId].token,
            orders[_orderId].itemUUID,
            orders[_orderId].amountForSale,
            orders[_orderId].price,
            orders[_orderId].isBid
        );
    }

    function fullfillOrder(uint256 _orderId, uint256 _amount) external override {
        // This will fail if _token address doesn't support the necessary
        Order storage order = orders[_orderId];
        require(order.user != msg.sender, "Order owner cannot fullfill order.");
        require(!order.claimable, "Order is already filled.");
        address sellerAddr;
        address buyerAddr;

        if (_amount > order.amountForSale) {
            _amount = order.amountForSale;
        }

        // Get game information
        (address gameAddr, , uint256 gameId) = globalItemRegistry().getItemInfo(order.itemUUID);

        if (order.isBid) {
            sellerAddr = msg.sender;
            buyerAddr = escrowAddr;

            // Approve escrow to move tokens to user
            require(
                escrow().approveToken(
                    order.token,
                    SafeMath.mul(_amount, order.price)),
                "Token is not supported."
            );
        } else {
            sellerAddr = escrowAddr;
            buyerAddr = msg.sender;
        }
        
        // Will fail if user does not have enough tokens
        IERC20(order.token).transferFrom(
            buyerAddr,
            sellerAddr,
            SafeMath.mul(_amount, order.price)
        );

        // Will revert if item fails to transfer
        IERC1155(gameAddr).safeTransferFrom(sellerAddr, buyerAddr, gameId, _amount, "");

        // Order is now claimable
        order.claimable = true;
        order.amountForSale = SafeMath.sub(order.amountForSale, _amount);
        order.amountEscrowed = SafeMath.add(order.amountEscrowed, _amount);

        emit OrderFilled(_orderId, msg.sender, order.user, order.itemUUID, _amount, order.price);
    }

    function claim(uint256 _orderId) external override {
        Order storage order = orders[_orderId];
        require(msg.sender == order.user, "Invalid user claim");
        require(order.claimable, "Order not fulfilled.");        
        
        if (order.isBid) {
            // Get game information
            (address gameAddr, , uint256 gameId) = globalItemRegistry().getItemInfo(order.itemUUID);
            
            // Will fail if escrow's balanace of the id is not enough
            IERC1155(gameAddr).safeTransferFrom(escrowAddr, msg.sender, gameId, order.amountEscrowed, "");
        } else {
            require(
                escrow().approveToken(
                    order.token,
                    SafeMath.mul(order.amountEscrowed, order.price)),
                "Token is not supported."
            );

            IERC20(order.token).transferFrom(
                escrowAddr,
                msg.sender,
                SafeMath.mul(order.amountEscrowed, order.price)
            );
        }
        
        order.amountEscrowed = 0;
        order.claimable = false;
        if (order.amountForSale == 0) {
            _deleteOrder(_orderId);
        }
        emit Claimed(msg.sender, _orderId);
    }

    function claimAll() external override {
        uint256[] memory orderIds = new uint256[](userOrders[msg.sender].length());
        uint256 counter;
        for (uint256 i = 0; i < userOrders[msg.sender].length(); ++i) {
            uint256 orderId = userOrders[msg.sender].at(i);
            Order storage order = orders[orderId];

            if (order.claimable) {
                if (order.isBid) {
                    // Get game information
                    (address gameAddr, , uint256 gameId) = globalItemRegistry().getItemInfo(order.itemUUID);

                    // Will fail if escrow's balanace of the id is not enough
                    IERC1155(gameAddr).safeTransferFrom(escrowAddr, msg.sender, gameId, order.amountEscrowed, "");
                } else {
                    require(
                        escrow().approveToken(
                            order.token,
                            SafeMath.mul(order.amountEscrowed, order.price)),
                        "Token is not supported."
                    );
                    IERC20(order.token).transferFrom(
                        escrowAddr,
                        msg.sender,
                        SafeMath.mul(order.amountEscrowed, order.price)
                    );
                }

                order.amountEscrowed = 0;
                order.claimable = false;
                if (order.amountForSale == 0) {
                    _deleteOrder(orderId);
                }
                orderIds[counter++] = orderId;
            }
        }
        emit ClaimedAll(msg.sender, orderIds);
    }

    /******** Internal Functions ********/

    function globalItemRegistry() internal view returns (IGlobalItemRegistry) {
        return IGlobalItemRegistry(globalItemRegistryAddr);
    }
    
    function escrow() internal view returns(ExchangeEscrow) {
        return ExchangeEscrow(escrowAddr);
    }

    function _deleteOrder(uint256 _orderId) internal {
        userOrders[orders[_orderId].user].remove(_orderId);

        // delete stored data
        delete orders[_orderId];
    }

    function _isClaimable(uint256 _orderId) internal view returns(bool) {
        return (orders[_orderId].user != address(0) && orders[_orderId].claimable);
    }
    
    function _generateOrderId(
        address _user,
        address _token,
        uint256 _uuid
    )
        internal
        returns(uint256)
    {
        return uint256(keccak256(abi.encodePacked(_user, _token, _uuid, orderIdCounter++)));
    }
}