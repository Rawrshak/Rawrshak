// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../../content/SystemsApproval.sol";

contract TestSystemsApproval is SystemsApproval {
    function __TestSystemsApproval_init() external initializer {
        __ERC165_init_unchained();
    }

    function isOperatorApprovedForAll(address _operator) external view returns (bool) {
        return _isOperatorApprovedForAll(_operator);
    }

    function setSystemApproval(LibAsset.SystemApprovalPair[] memory _operators) external {
        return _setSystemApproval(_operators);
    }
}