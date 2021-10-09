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
        require(_rate <= 1e6, "Invalid Fee Rate");
    }
}