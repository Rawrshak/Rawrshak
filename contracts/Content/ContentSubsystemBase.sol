// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "./interfaces/IContentSubsystemBase.sol";
import "../utils/LibInterfaces.sol";

abstract contract ContentSubsystemBase is IContentSubsystemBase, ERC165StorageUpgradeable {

    /******************** Constants ********************/
    /*
     * IContentSubsystemBase: 0x7460af1d
     */

    /***************** Stored Variables *****************/
    address contentParent;

    /******************** Public API ********************/
    function __ContentSubsystemBase_init_unchained() internal initializer {
        _registerInterface(type(IContentSubsystemBase).interfaceId);
    }

    function setParent(address) external virtual override {
        // No-op
    }

    function parent() external view override returns (address) {
        return _parent();
    }
    
    function _setParent(address _contentParent) internal {
        contentParent = _contentParent;
    }

    function _parent() internal view returns(address) {
        return contentParent;
    }
}