// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../../libraries/LibOrder.sol";
import "../../libraries/LibRoyalties.sol";

interface IRoyaltyManager { 
    /******** View Functions ********/
    function getAllExchangeFees() external view returns(LibRoyalties.Fees[] memory);

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

    function transferRoyalty(
        bytes4 _token,
        uint256 _orderId,
        address[] memory _accounts,
        uint256[] memory _amounts
    ) external;

    function setExchangeFees(LibRoyalties.Fees[] calldata _newFees) external;
}