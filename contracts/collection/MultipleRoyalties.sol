// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../libraries/LibRoyalty.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";

abstract contract MultipleRoyalties is ERC165StorageUpgradeable {

    /***************** Stored Variables *****************/
    mapping(uint256 => address[]) private royaltyReceivers;
    mapping(uint256 => uint24[]) private royaltyRates;

    /*********************** Events *********************/
    event TokenRoyaltiesUpdated(uint256 indexed uniqueId, address[] royaltyReceivers, uint24[] royaltyRates);

    /******************** Public API ********************/
    function __MultipleRoyalties_init_unchained() internal onlyInitializing {
    }

    /**************** Internal Functions ****************/
    /**
     * @dev Internal helper function to find the length of the royalties' arrays
     * @param _tokenId uint256 ID of the unique asset to query
     */
    function _getTokenRoyaltiesLength(uint256 _tokenId) internal view returns (uint256) {
        return royaltyReceivers[_tokenId].length;
    }
    
    /**
     * @dev Internal function which returns the royalty receiver addresses and rates for a token
     * @param _tokenId uint256 ID of the unique asset to query
     */
    function _getMultipleRoyalties(uint256 _tokenId) internal view returns (address[] memory receivers, uint24[] memory rates) {
        return (royaltyReceivers[_tokenId], royaltyRates[_tokenId]);
    }

    /**
     * @dev Internal function to delete a token's royalty info
     * @param _tokenId uint256 ID of the unique asset whose royalties are to be deleted
     */
    function _deleteTokenRoyalties(uint256 _tokenId) internal {
        delete royaltyReceivers[_tokenId];
        delete royaltyRates[_tokenId];
    }

    /**
     * @dev Internal function to set to a specific token's royalties
     * @param _tokenId uint256 ID of the unique asset to add a royalty to
     * @param _royaltyReceivers addresses to receive the royalties
     * @param _royaltyRates royalty fee percentages
     */
    function _setTokenRoyalties(uint256 _tokenId, address[] memory _royaltyReceivers, uint24[] memory _royaltyRates) internal {
        _deleteTokenRoyalties(_tokenId);
        for (uint256 i = 0; i < _royaltyReceivers.length; ++i) {
            if (_royaltyReceivers[i] != address(0) && _royaltyRates[i] > 0) {
                royaltyReceivers[_tokenId].push(_royaltyReceivers[i]);
                royaltyRates[_tokenId].push(_royaltyRates[i]);
            }
        }
        emit TokenRoyaltiesUpdated(_tokenId, royaltyReceivers[_tokenId], royaltyRates[_tokenId]);
    }

    uint256[50] private __gap;
}