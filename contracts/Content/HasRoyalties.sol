// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../libraries/LibRoyalties.sol";

abstract contract HasRoyalties is ERC165StorageUpgradeable {

    /******************** Constants ********************/
    /*
     * bytes4(keccak256('contractRoyalties()')) == 0x0982790e
     */
    bytes4 private constant _INTERFACE_ID_ROYALTIES = 0x0982790e;

    /***************** Stored Variables *****************/
    // All assets sales on this contract will pay the contract royalties
    LibRoyalties.Fees[] public contractRoyalties;

    // Specific assets can also have their own royalties set
    mapping (uint256 => LibRoyalties.Fees[]) tokenRoyalties;
    
    /*********************** Events *********************/
    event TokenRoyaltiesUpdated(uint256 tokenId, LibRoyalties.Fees[] fees);
    event ContractRoyaltiesUpdated(LibRoyalties.Fees[] fees);

    /******************** Public API ********************/
    function __HasRoyalties_init_unchained(LibRoyalties.Fees[] memory _fees) internal initializer {
        _setContractRoyalties(_fees);
        _registerInterface(_INTERFACE_ID_ROYALTIES);
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
        emit ContractRoyaltiesUpdated(_fees);
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
        emit TokenRoyaltiesUpdated(_tokenId, _fees);
    }

    /**
     * @dev Internal function to set the royalties for a token
     * @param _tokenId uint256 ID of the token to query
     * If the token id does not have royalties, the contract royalties is returned.
     * contractRoyalties and tokenRoyalties[tokenId] can both be null
     */
    function _getRoyalties(uint256 _tokenId) internal view returns (LibRoyalties.Fees[] memory) {
        if (tokenRoyalties[_tokenId].length == 0) {
            return contractRoyalties;
        }
        return tokenRoyalties[_tokenId];
    }
    
    uint256[50] private __gap;
}