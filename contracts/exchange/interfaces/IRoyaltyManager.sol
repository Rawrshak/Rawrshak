// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../libraries/LibOrder.sol";
import "../../libraries/LibRoyalties.sol";

interface IRoyaltyManager { 
    /******** View Functions ********/

    function claimableRoyalties(address _user) external view returns(address[] memory tokens, uint256[] memory amounts);

    function payableRoyalties(
        LibOrder.AssetData calldata _asset,
        uint256 _total
    ) external view returns(address[] memory creators, uint256[] memory creatorRoyaltyFees, uint256 remaining);

    /******** Mutative Functions ********/
    function claimRoyalties(address _user) external;

    function depositRoyalty(
        address _sender,
        address _token,
        address[] memory _accounts,
        uint256[] memory _amounts
    ) external;

    function depositPlatformFees(address _sender, address _token, uint256 _total) external;

    function transferRoyalty(
        uint256 _orderId,
        address[] memory _accounts,
        uint256[] memory _amounts
    ) external;
    
    function transferPlatformFees(address _token, uint256 _orderId, uint256 _total) external;
}