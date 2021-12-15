// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../content/MultipleRoyalties.sol";

contract TestMultipleRoyalties is MultipleRoyalties {

    function setTokenRoyalties(uint256 _uniqueId, address[] memory _royaltyReceivers, uint24[] memory _royaltyRates) external {
        _setTokenRoyalties(_uniqueId, _royaltyReceivers, _royaltyRates);
    }

    function multipleRoyaltyInfo(uint256 _uniqueId) external view returns(address[] memory _receivers, uint24[] memory _rates) {
        return _getMultipleRoyalties(_uniqueId);
    }

    function verifyRoyalties(address[] memory _royaltyReceivers, uint24[] memory _royaltyRates) external pure {
        _verifyRoyalties(_royaltyReceivers, _royaltyRates);
    }
}