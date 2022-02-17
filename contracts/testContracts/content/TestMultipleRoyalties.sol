// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../content/MultipleRoyalties.sol";

contract TestMultipleRoyalties is MultipleRoyalties {

    function setTokenRoyalties(uint256 _uniqueId, address[] memory _royaltyReceivers, uint24[] memory _royaltyRates) external {
        _setTokenRoyalties(_uniqueId, _royaltyReceivers, _royaltyRates);
    }

    function getMultipleRoyalties(uint256 _uniqueId) external view returns (address[] memory _receivers, uint24[] memory _rates) {
        return _getMultipleRoyalties(_uniqueId);
    }

    function verifyRoyalties(address[] memory _royaltyReceivers, uint24[] memory _royaltyRates, uint256 _originalRoyaltyRate) external pure returns (bool) {
        return LibRoyalty.verifyRoyalties(_royaltyReceivers, _royaltyRates, _originalRoyaltyRate);
    }

    function deleteTokenRoyalties(uint256 _uniqueId) external {
        _deleteTokenRoyalties(_uniqueId);
    }

    function getTokenRoyaltiesLength(uint256 _uniqueId) external view returns (uint256) {
        return _getTokenRoyaltiesLength(_uniqueId);
    }
}