// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../../content/SystemsApproval.sol";

contract TestSystemsApproval is SystemsApproval {
    function __TestSystemsApproval_init() external initializer {
        __ERC165_init_unchained();
    }

    function isSystemOperatorApproved(address _user, address _operator) external view returns (bool) {
        return _isSystemOperatorApproved(_user, _operator);
    }

    function userApprove(address _user, bool _approved) external {
        _userApprove(_user, _approved);
    }

    function registerSystems(LibAsset.SystemApprovalPair[] memory _operators) external {
        _registerSystems(_operators);
    }
}