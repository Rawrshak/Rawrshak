// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../libraries/LibRoyalty.sol";

abstract contract MultipleRoyalties{

    /***************** Stored Variables *****************/
    mapping(uint256 => LibRoyalty.Fee[]) private tokenRoyalties;

    /*********************** Events *********************/
    event TokenRoyaltiesUpdated(uint256 indexed uniqueId, address[] royaltyReceivers, uint24[] royaltyRates);

    /**************** Internal Functions ****************/
    /**
     * @dev Internal helper function to find the length of the royalties' arrays
     * @param _uniqueId uint256 ID of the unique asset to query
     */
    function _getTokenRoyaltiesLength(uint256 _uniqueId) internal view returns (uint256) {
        return tokenRoyalties[_uniqueId].length;
    }
    
    /**
     * @dev Internal function which returns the royalty receiver addresses and rates for a token
     * @param _uniqueId uint256 ID of the unique asset to query
     */
    function _getMultipleRoyalties(uint256 _uniqueId) internal view returns (address[] memory receivers, uint24[] memory rates) {
        uint256 length = _getTokenRoyaltiesLength(_uniqueId);
        receivers = new address[](length);
        rates = new uint24[](length);

        for (uint256 i = 0; i < length; ++i) {
            receivers[i] = tokenRoyalties[_uniqueId][i].receiver;
            rates[i] = tokenRoyalties[_uniqueId][i].rate;
        }
        return (receivers, rates);
    }

    /**
     * @dev Internal function to delete a token's royalty info
     * @param _uniqueId uint256 ID of the unique asset whose royalties are to be deleted
     */
    function _deleteTokenRoyalties(uint256 _uniqueId) internal {
        delete tokenRoyalties[_uniqueId];
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
            if (_royaltyReceivers[i] == address(0) || _royaltyRates[i] == 0) {
            } else {
                LibRoyalty.Fee memory fee;
                fee.receiver = _royaltyReceivers[i];
                fee.rate = _royaltyRates[i];
                tokenRoyalties[_uniqueId].push(fee);
            }
        }
        emit TokenRoyaltiesUpdated(_uniqueId, _royaltyReceivers, _royaltyRates);
    }

    /**
    * @dev Verifies whether the sum of the royalties exceed 1e6 and whether the number of royalties are receivers match
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
        return (sum <= 1e6);
    }

    uint256[50] private __gap;
}