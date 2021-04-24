// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../../content/HasRoyalties.sol";
import "../../libraries/LibAsset.sol";

contract TestHasRoyalties is HasRoyalties {
    function __TestHasRoyalties_init(LibRoyalties.Fees[] memory _contractFees) external initializer {
        __HasRoyalties_init_unchained(_contractFees);
        __ERC165Storage_init_unchained();
    }
    
    function getRoyalties(uint256 _tokenId) external view returns (LibRoyalties.Fees[] memory) {
        // If token id doesn't exist or there isn't a royalty fee attached to this specific token, 
        // _getRoyalties() will return the contract's default royalty fee. However, that can also
        // be null. In the case of null, there are no royalty fees. 
        return _getRoyalties(_tokenId);
    }

    function setContractRoyalties(LibRoyalties.Fees[] memory _fee) external {
        // This can be reset by setting _fee to an empty string.
        // This overwrites the existing array of contract fees.
        _setContractRoyalties(_fee);
    }

    function setTokenRoyaltiesBatch(LibAsset.AssetRoyalties[] memory _assets) external {
        // This overwrites the existing array of contract fees.
        for (uint256 i = 0; i < _assets.length; ++i) {
            _setTokenRoyalties(_assets[i].tokenId, _assets[i].fees);
        }
    }
}