// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "./Orderbook.sol";
import "./RoyaltyManagement.sol";
import "./EscrowERC20.sol";

contract Exchange is Orderbook, RoyaltyManagement {
    
    /******************** Constants ********************/
    /***************** Stored Variables *****************/
    /*********************** Events *********************/
    /********************* Modifiers ********************/
    /******************** Public API ********************/
    function __Exchange_init() public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        __Orderbook_init_unchained();
        __RoyaltyManagement_init_unchained(); 
    }

    // exchange functions
    function placeOrder(LibOrder.OrderData memory _order) external {
        require(_order.owner == _msgSender(), "Invalid Order.");
        // todo: add more requires

        // create order id
        uint256 id = _generateOrderId(_msgSender(), _order.asset.contentAddress, _order.asset.tokenId);

        if (_order.isBuyOrder) {
            // if it's a buy order, move tokens to ERC20 escrow.
            require(contracts[ESCROW_ERC20_CONTRACT] != address(0), "ERC 20 Escrow Contract is not yet set");
            
            uint256 tokenAmount = SafeMathUpgradeable.mul(_order.amount, _order.price);
            EscrowERC20(contracts[ESCROW_ERC20_CONTRACT]).deposit(_msgSender(), _order.tokenAddr, tokenAmount);
        } else {
            // if it's a sell order, move NFT to escrow
            require(contracts[ESCROW_NFTS_CONTRACT] != address(0), "ERC 20 Escrow Contract is not yet set");

            EscrowNFTs(contracts[ESCROW_NFTS_CONTRACT]).deposit(_msgSender(), id, _order.amount, _order.asset);
        }

        // place order in orderbook
        _placeOrder(id, _order);
    }

    function fillBuyOrder(
        uint256[] memory _orderIds,
        LibOrder.AssetData memory _asset,
        address _token,
        uint256 _maxAmount,
        uint256 _maxPrice) external {
        // Check Input
        // validate orders
        //  - make sure all same asset
        //  - make sure below max price

        // Get the order ids that satisfy the amount

        // calculate total price and add royalties from asset and platform

        // Storage->fill buy order

        // send payment to escrow as claimable

        // distribute royalties

        // send asset to buyer
    }

    function fillSellOrder(uint256[] memory orderIds, uint256 maxAmount, uint256 maxPrice) external {

    }

    function deleteOrder() external {

    }

    function getOrder() external {

    }

    function claim() external {

    }

    // royalty functions
    function setPlatformFees(LibRoyalties.Fees[] memory newFees) external onlyOwner {
        require(newFees.length > 0, "Invalid fees.");
        
        _setPlatformFees(newFees);
    }

    function getRoyalties(address token) external view returns (uint256) {
        require(token != address(0), "Invalid address");
        return _getClaimableRoyalties(_msgSender(), token);
    }

    function claimRoyalties(address token) external {
        require(token != address(0), "Invalid address");
        _claimRoyalties(_msgSender(), token);
    }

    /**************** Internal Functions ****************/

}