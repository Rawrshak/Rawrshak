// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../LibOrder.sol";
import "../../content/LibRoyalties.sol";

interface IRoyaltyManager { 
    /******** Mutative Functions ********/
    function addSupportedToken(bytes4 _token, bytes4 _tokenDistribution) external;
    
    function claimRoyalties(address _user, bytes4 _token) external;

    function deductRoyaltiesFromUser(
        uint256 _orderId,
        address _from,
        bytes4 _token,
        LibOrder.AssetData calldata _asset,
        uint256 total
    ) external returns(uint256 remaining);

    function deductRoyaltiesFromEscrow(
        uint256 _orderId,
        bytes4 _token,
        LibOrder.AssetData calldata _asset,
        uint256 total
    ) external returns(uint256 remaining);

    function setPlatformFees(LibRoyalties.Fees[] calldata _newFees) external;

    function getPlatformFees() external view returns(LibRoyalties.Fees[] memory);

    function getDistributionsAmount(address _user, bytes4 _token) external view returns(uint256);
}