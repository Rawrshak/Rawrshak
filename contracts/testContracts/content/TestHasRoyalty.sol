// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../content/HasRoyalty.sol";
import "../../libraries/LibAsset.sol";

contract TestHasRoyalty is HasRoyalty {
    function __TestHasRoyalty_init(address _receiver, uint24 _rate) external initializer {
        __HasRoyalty_init_unchained(_receiver, _rate);
        __ERC165Storage_init_unchained();
    }
    
    function getRoyalty(uint256 _tokenId) external view returns (address receiver, uint24 rate) {
        // If token id doesn't exist or there isn't a royalty fee attached to this specific token, 
        // _getRoyalty() will return the contract's default royalty fee. However, that can also
        // be null. In the case of null, there are no royalty fees. 
        return _getRoyalty(_tokenId);
    }

    function setContractRoyalty(address _receiver, uint24 _rate) external {
        // This can be reset by setting _fee to an empty string.
        // This overwrites the existing array of contract fees.
        _setContractRoyalty(_receiver, _rate);
    }

    function setTokenRoyaltiesBatch(LibAsset.AssetRoyalties[] memory _assets) external {
        // This overwrites the existing array of contract fees.
        for (uint256 i = 0; i < _assets.length; ++i) {
            _setTokenRoyalty(_assets[i].tokenId, _assets[i].fee.receiver, _assets[i].fee.rate);
        }
    }
}