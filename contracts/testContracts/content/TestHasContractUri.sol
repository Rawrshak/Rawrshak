// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../content/HasContractUri.sol";

contract TestHasContractUri is HasContractUri {
    function initialize(string memory _contractUri) external initializer {
        __HasContractUri_init_unchained(_contractUri);
        __ERC165Storage_init_unchained();
    }

    function setContractUri(string memory _contractUri) external {
        _setContractUri(_contractUri);
    }
}