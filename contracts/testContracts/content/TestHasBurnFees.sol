// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../../content/interfaces/IRoyaltyProvider.sol";
import "../../content/HasBurnFees.sol";
import "../../libraries/LibAsset.sol";

contract TestHasBurnFees is HasBurnFees {
    function __TestHasBurnFees_init() external initializer {
        __HasBurnFees_init_unchained();
        __ERC165Storage_init_unchained();
    }
    
    function getBurnFee(uint256 _tokenId) external view returns (LibAsset.Fee[] memory) {
        return _getBurnFee(_tokenId);
    }

    function setContractBurnFees(LibAsset.Fee[] memory _fee) external {
        // This can be reset by setting _fee to an empty string.
        // This overwrites the existing array of contract fees.
        _setContractBurnFees(_fee);
    }

    function setTokenBurnFeesBatch(LibAsset.AssetBurnFees[] memory _assets) external {
        for (uint256 i = 0; i < _assets.length; ++i) {
            _setTokenBurnFees(_assets[i].tokenId, _assets[i].fees);
        }
    }
}