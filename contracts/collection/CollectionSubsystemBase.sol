// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "./interfaces/ICollectionSubsystemBase.sol";

abstract contract CollectionSubsystemBase is ICollectionSubsystemBase, ERC165StorageUpgradeable {

    /******************** Constants ********************/
    /*
     * ICollectionSubsystemBase: 0x7460af1d
     */

    /***************** Stored Variables *****************/
    address collectionParent;

    /******************** Public API ********************/
    function __CollectionSubsystemBase_init_unchained() internal onlyInitializing {
        _registerInterface(type(ICollectionSubsystemBase).interfaceId);
    }
    /**
    * @dev assigns the address of collectionParent
    */
    function setParent(address) external virtual override {
        // No-op
    }

    /**
    * @dev returns the collectionParent address 
    */
    function parent() external view override returns (address) {
        return _parent();
    }
    
    function _setParent(address _collectionParent) internal {
        collectionParent = _collectionParent;
    }

    function _parent() internal view returns(address) {
        return collectionParent;
    }
}