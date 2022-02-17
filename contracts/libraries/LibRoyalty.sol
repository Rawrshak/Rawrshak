// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library LibRoyalty {

    struct Fee {
        address receiver;
        uint24 rate;
    }

    function validateFee(address _receiver, uint24 _rate) internal pure {
        // Note: _rate can be 0; This signifies no royalty
        require(_receiver != address(0), "Invalid Account Address");
        require(_rate <= 2e5, "Invalid Fee Rate");
    }

    function verifyRoyalties(address[] memory _royaltyReceivers, uint24[] memory _royaltyRates, uint256 _originalRoyaltyRate) internal pure returns (bool) {
        if (_royaltyReceivers.length != _royaltyRates.length) {
            return false;
        }
        uint256 sum = _originalRoyaltyRate;
        for (uint256 i = 0; i < _royaltyReceivers.length; ++i) {
            sum += _royaltyRates[i];
        }
        return (sum <= 2e5);
    }
}