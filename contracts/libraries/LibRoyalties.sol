// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

library LibRoyalties {

    struct Fees {
        address payable account;
        uint256 bps;
    }

    function validateFees(LibRoyalties.Fees[] memory _fees) internal pure {
        for (uint256 i = 0; i < _fees.length; ++i) {
            require(_fees[i].account != address(0), "Invalid Account Address");
            require(_fees[i].bps != 0, "Invalid Fees");
        }
    }
}