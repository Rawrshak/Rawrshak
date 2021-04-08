// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "./LibRoyalties.sol";

contract HasRoyalties {

    /***************** Stored Variables *****************/
    // All assets sales on this contract will pay the contract royalties
    LibRoyalties.Fees[] contractRoyalties;

    // Specific assets can also have their own royalties set
    mapping (uint256 => LibRoyalties.Fees[]) tokenRoyalties;
    
    /*********************** Events *********************/
    event RoyaltiesSet(uint256 tokenId, LibRoyalties.Fees[] fees);
    event ContractRoyaltiesSet(LibRoyalties.Fees[] fees);

    /******************** Public API ********************/
    constructor(LibRoyalties.Fees[] memory _fees) {
        _setContractRoyalties(_fees);
    }

    /**
     * @dev Extarnal function to set the royalties for a token
     * If the token id does not have royalties, the contract royalties is returned.
     * contractRoyalties and tokenRoyalties[tokenId] can both be null
     * @param _tokenId uint256 ID of the token to query
     */
    function getRoyalties(uint256 _tokenId) external view returns (LibRoyalties.Fees[] memory) {
        if (tokenRoyalties[_tokenId].length == 0) {
            return contractRoyalties;
        }
        return tokenRoyalties[_tokenId];
    }

    /**************** Internal Functions ****************/
    /**
     * @dev Internal function to set the contract royalties
     * @param _fees LibRoyalties.Fees[] array containing the account and percentage royalties
     * pair
     */
    function _setContractRoyalties(LibRoyalties.Fees[] memory _fees) internal {
        LibRoyalties.validateFees(_fees);
        delete contractRoyalties;
        for (uint256 i = 0; i < _fees.length; ++i) {
            contractRoyalties.push(_fees[i]);
        }
        if (contractRoyalties.length > 0) {
            emit ContractRoyaltiesSet(_fees);
        }
    }

    /**
     * @dev Internal function to set to a specific token's royalties
     * @param _tokenId uint256 ID of the token to add a royalty
     * @param _fees LibRoyalties.Fees[] array containing the account and percentage royalties
     * pair
     */
    function _setTokenRoyalties(uint256 _tokenId, LibRoyalties.Fees[] memory _fees) internal {
        LibRoyalties.validateFees(_fees);
        delete tokenRoyalties[_tokenId];
        for (uint256 i = 0; i < _fees.length; ++i) {
            tokenRoyalties[_tokenId].push(_fees[i]);
        }
        if (tokenRoyalties[_tokenId].length > 0) {
            emit RoyaltiesSet(_tokenId, _fees);
        }
    }
}