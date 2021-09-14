// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../libraries/LibOrder.sol";
import "../../libraries/LibRoyalties.sol";

interface IRoyaltyManager { 
    /******** View Functions ********/

    function claimableRoyaltyAmount(address _user, bytes4 _token) external view returns(uint256);

    function getRequiredRoyalties(
        LibOrder.AssetData calldata _asset,
        uint256 _total
    ) external view returns(address[] memory accounts, uint256[] memory royaltyAmounts, uint256 remaining);

    /******** Mutative Functions ********/
    function claimRoyalties(address _user, bytes4 _token) external;

    function depositRoyalty(
        address _sender,
        bytes4 _token,
        address[] memory _accounts,
        uint256[] memory _amounts
    ) external;

    function depositPlatformRoyalty(address _sender, bytes4 _token, uint256 _total) external;

    function transferRoyalty(
        bytes4 _token,
        uint256 _orderId,
        address[] memory _accounts,
        uint256[] memory _amounts
    ) external;
    
    function transferPlatformRoyalty(bytes4 _token, uint256 _orderId, uint256 _total) external;

    /*********************** Events *********************/
    event RoyaltiesClaimed(address indexed to, address tokenAddr, uint256 amountClaimed);
}