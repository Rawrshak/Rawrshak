// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library LibRoyalties {

    struct Fees {
        address payable account;
        uint256 rate;
    }

    function validateFees(LibRoyalties.Fees[] memory _fees) internal pure {
        for (uint256 i = 0; i < _fees.length; ++i) {
            require(_fees[i].account != address(0), "Invalid Account Address");
            require(_fees[i].rate != 0 && _fees[i].rate <= 1 ether, "Invalid Fee Rate");
        }
    }
}