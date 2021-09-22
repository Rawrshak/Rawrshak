// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library LibRoyalties {

    struct Fees {
        address account;
        uint24 rate;
    }

    function validateFees(address _receiver, uint24 _rate) internal pure {
        require(_receiver != address(0), "Invalid Account Address");
        require(_rate != 0 && _rate <= 1e6, "Invalid Fee Rate");
    }
}