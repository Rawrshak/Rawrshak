// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../LibOrder.sol";

interface IEscrowNFTs {
    // Mutable Functions
    function deposit(
        uint256 orderId,
        uint256 amount,
        LibOrder.AssetData memory assetData
    ) external;

    function getEscrowedAssetsByOrder(uint256 _orderId) external view returns(uint256);

    function withdraw(uint256 orderId, uint256 amount) external;

    function withdrawBatch(uint256[] memory orderIds, uint256[] memory amounts) external;

}