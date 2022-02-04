// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../libraries/LibRoyalty.sol";

abstract contract MultipleRoyalties{

    /***************** Stored Variables *****************/
    mapping(uint256 => address[]) private royaltyReceivers;
    mapping(uint256 => uint24[]) private royaltyRates;

    /*********************** Events *********************/
    event TokenRoyaltiesUpdated(uint256 indexed uniqueId, address[] royaltyReceivers, uint24[] royaltyRates);

    /**************** Internal Functions ****************/
    /**
     * @dev Internal helper function to find the length of the royalties' arrays
     * @param _uniqueId uint256 ID of the unique asset to query
     */
    function _getTokenRoyaltiesLength(uint256 _uniqueId) internal view returns (uint256) {
        return royaltyReceivers[_uniqueId].length;
    }
    
    /**
     * @dev Internal function which returns the royalty receiver addresses and rates for a token
     * @param _uniqueId uint256 ID of the unique asset to query
     */
    function _getMultipleRoyalties(uint256 _uniqueId) internal view returns (address[] memory receivers, uint24[] memory rates) {
        return (royaltyReceivers[_uniqueId], royaltyRates[_uniqueId]);
    }

    /**
     * @dev Internal function to delete a token's royalty info
     * @param _uniqueId uint256 ID of the unique asset whose royalties are to be deleted
     */
    function _deleteTokenRoyalties(uint256 _uniqueId) internal {
        delete royaltyReceivers[_uniqueId];
        delete royaltyRates[_uniqueId];
    }

    /**
     * @dev Internal function to set to a specific token's royalties
     * @param _uniqueId uint256 ID of the unique asset to add a royalty to
     * @param _royaltyReceivers addresses to receive the royalties
     * @param _royaltyRates royalty fee percentages
     */
    function _setTokenRoyalties(uint256 _uniqueId, address[] memory _royaltyReceivers, uint24[] memory _royaltyRates) internal {
        _deleteTokenRoyalties(_uniqueId);
        for (uint256 i = 0; i < _royaltyReceivers.length; ++i) {
            if (_royaltyReceivers[i] != address(0) && _royaltyRates[i] > 0) {
                royaltyReceivers[_uniqueId].push(_royaltyReceivers[i]);
                royaltyRates[_uniqueId].push(_royaltyRates[i]);
            }
        }
        emit TokenRoyaltiesUpdated(_uniqueId, royaltyReceivers[_uniqueId], royaltyRates[_uniqueId]);
    }

    /**
    * @dev Verifies whether the sum of the royalties exceed 2e5 and whether the number of royalties and receivers match
    * @param _royaltyReceivers addresses to receive the royalties
    * @param _royaltyRates royalty fee percentages
    * @param _originalRoyaltyRate royalty rate of the original item
    */
    function _verifyRoyalties(address[] memory _royaltyReceivers, uint24[] memory _royaltyRates, uint256 _originalRoyaltyRate) internal pure returns (bool) {
        if (_royaltyReceivers.length != _royaltyRates.length) {
            return false;
        }
        uint256 sum = _originalRoyaltyRate;
        for (uint256 i = 0; i < _royaltyReceivers.length; ++i) {
            sum += _royaltyRates[i];
        }
        return (sum <= 2e5);
    }

    uint256[50] private __gap;
}