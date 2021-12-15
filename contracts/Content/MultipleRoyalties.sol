// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../libraries/LibRoyalty.sol";
import "hardhat/console.sol";

abstract contract MultipleRoyalties{

    /***************** Stored Variables *****************/
    mapping(uint256 => LibRoyalty.Fee[]) internal tokenRoyalties;

    /*********************** Events *********************/
    event TokenRoyaltiesUpdated(uint256 indexed uniqueId, address[] royaltyReceivers, uint24[] royaltyRates);

    /**************** Internal Functions ****************/
    /**
     * @dev Internal function which returns the royalty receiver addresses and rates for a token
     * @param _uniqueId uint256 ID of the unique asset to query
     */
    function _getMultipleRoyalties(uint256 _uniqueId) internal view returns (address[] memory receivers, uint24[] memory rates) {
        uint256 arraySize = tokenRoyalties[_uniqueId].length;
        receivers = new address[](arraySize);
        rates = new uint24[](arraySize);

        for (uint256 i = 0; i < arraySize; ++i) {
            receivers[i] = tokenRoyalties[_uniqueId][i].receiver;
            rates[i] = tokenRoyalties[_uniqueId][i].rate;
        }
        return (receivers, rates);
    }

    /**
     * @dev Internal function to set to a specific token's royalties
     * @param _uniqueId uint256 ID of the unique asset to add a royalty to
     * @param _royaltyReceivers addresses to receive the royalties
     * @param _royaltyRates royalty fee percentages
     */
    function _setTokenRoyalties(uint256 _uniqueId, address[] memory _royaltyReceivers, uint24[] memory _royaltyRates) internal {
        for (uint256 i = 0; i < _royaltyReceivers.length; ++i) {
            LibRoyalty.Fee memory fee;
            fee.receiver = _royaltyReceivers[i];
            fee.rate = _royaltyRates[i];
            tokenRoyalties[_uniqueId].push(fee);
        }
        emit TokenRoyaltiesUpdated(_uniqueId, _royaltyReceivers, _royaltyRates);
    }

    /**
    * @dev Verifies whether the sum of the royalties exceed 1e6 and whether the number of royalties are receivers match
    * @param _royaltyReceivers addresses to receive the royalties
    * @param _royaltyRates royalty fee percentages
    */
    function _verifyRoyalties(address[] memory _royaltyReceivers, uint24[] memory _royaltyRates) internal pure {
        require(_royaltyReceivers.length == _royaltyRates.length, "Number of addresses and royalty rates do not match.");
        uint24 sum;
        for (uint256 i = 0; i < _royaltyReceivers.length; ++i) {
            sum += _royaltyRates[i];
        }
        require(sum <= 1000000, "Sum of royalties cannot exceed 1e6.");
    }
}