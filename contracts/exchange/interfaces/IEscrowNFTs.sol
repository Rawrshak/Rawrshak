// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../LibOrder.sol";

interface IEscrowNFTs {
    // Mutable Functions
    function deposit(
        uint256 orderId,
        address _sender,
        uint256 amount,
        LibOrder.AssetData memory assetData
    ) external;

    function getEscrowedAssetsByOrder(uint256 _orderId) external view returns(uint256 amount);
    
    function getOrderAsset(uint256 _orderId) external view returns(LibOrder.AssetData memory orderData);

    function withdraw(uint256 orderId, address _receiver, uint256 amount) external;

    function withdrawBatch(uint256[] memory orderIds, address _receiver, uint256[] memory amounts) external;

}