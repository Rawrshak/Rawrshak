// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../collection/MultipleRoyalties.sol";

contract TestMultipleRoyalties is MultipleRoyalties {

    function setTokenRoyalties(uint256 _paTokenId, address[] memory _royaltyReceivers, uint24[] memory _royaltyRates) external {
        _setTokenRoyalties(_paTokenId, _royaltyReceivers, _royaltyRates);
    }

    function getMultipleRoyalties(uint256 _paTokenId) external view returns (address[] memory _receivers, uint24[] memory _rates) {
        return _getMultipleRoyalties(_paTokenId);
    }

    function verifyRoyalties(address[] memory _royaltyReceivers, uint24[] memory _royaltyRates, uint256 _originalRoyaltyRate) external pure returns (bool) {
        return LibRoyalty.verifyRoyalties(_royaltyReceivers, _royaltyRates, _originalRoyaltyRate);
    }

    function deleteTokenRoyalties(uint256 _paTokenId) external {
        _deleteTokenRoyalties(_paTokenId);
    }

    function getTokenRoyaltiesLength(uint256 _paTokenId) external view returns (uint256) {
        return _getTokenRoyaltiesLength(_paTokenId);
    }
}