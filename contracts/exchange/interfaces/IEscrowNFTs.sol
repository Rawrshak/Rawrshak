// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../../libraries/LibOrder.sol";

interface IEscrowNFTs {
    
    /******** View Functions ********/
    function escrowedAssetsByOrder(uint256 _orderId) external view returns(uint256);
    
    function assetData(uint256 _orderId) external view returns(address contentAddress, uint256 tokenId);

    /******** Mutative Functions ********/
    function deposit(
        uint256 _orderId,
        address _sender,
        uint256 _amount,
        LibOrder.AssetData memory _assetData
    ) external;

    function withdraw(uint256 orderId, address _receiver, uint256 amount) external;

    function withdrawBatch(uint256[] memory orderIds, address _receiver, uint256[] memory amounts) external;

}