// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../../content/HasContractUri.sol";

contract TestHasContractUri is HasContractUri {
    function __TestHasContractUri_init(string memory _contractUri) external initializer {
        __HasContractUri_init_unchained(_contractUri);
        __ERC165Storage_init_unchained();
    }

    function setContractUri(string memory _contractUri) external {
        _setContractUri(_contractUri);
    }
}