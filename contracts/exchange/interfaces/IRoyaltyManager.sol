// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../LibOrder.sol";
import "../../content/LibRoyalties.sol";

interface IRoyaltyManager { 
    /******** Mutative Functions ********/    
    function claimRoyalties(address _user, bytes4 _token) external;

    function getRequiredRoyalties(
        LibOrder.AssetData calldata _asset,
        uint256 _total
    ) external returns(address[] memory accounts, uint256[] memory royaltyAmounts, uint256 remaining);

    function depositRoyalty(
        address _sender,
        bytes4 _token,
        address[] memory _accounts,
        uint256[] memory _amounts
    ) external;

    function transferRoyalty(
        bytes4 _token,
        uint256 _orderId,
        address[] memory _accounts,
        uint256[] memory _amounts
    ) external;

    function setPlatformFees(LibRoyalties.Fees[] calldata _newFees) external;

    function getPlatformFees() external view returns(LibRoyalties.Fees[] memory);

    function getClaimableRoyaltyAmount(address _user, bytes4 _token) external view returns(uint256);
}