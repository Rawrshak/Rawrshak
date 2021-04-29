// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "../libraries/LibAsset.sol";

abstract contract SystemsApproval is ERC165StorageUpgradeable {
    using EnumerableSetUpgradeable for *;
        
    /***************** Stored Variables *****************/
    // Rawrshak system addresses that are approved to interact with this contract
    EnumerableSetUpgradeable.AddressSet private systems;
    EnumerableSetUpgradeable.AddressSet private users;

    /*********************** Events *********************/
    event UserApproved(address user, bool approved);
    event SystemApproved(LibAsset.SystemApprovalPair[] operators);

    /**************** Internal Functions ****************/
    /**
     * @dev Internal function to check whether an operator is pre-approved
     * @param _operator address to check
     */
    function _isSystemOperatorApproved(address _user, address _operator) internal view returns (bool) {
        return users.contains(_user) && systems.contains(_operator);
    }

    function _isOperatorRegistered(address _operator) internal view returns (bool) {
        return systems.contains(_operator);
    }

    /**
     * @dev Internal function to approve a pre-approve system address
     * @param _user [bool] user address
     * @param _approved [bool] whether user approved or unapproved crafting/salvage operators
     */
    function _userApprove(address _user, bool _approved) internal {
        if (_approved) {
            users.add(_user);
        } else {
            users.remove(_user);
        }

        emit UserApproved(_user, _approved);
    }

    /**
     * @dev Internal function to approve a pre-approve system address
     * @param _operators [address,bool] addresses of system contracts to be approved
     */
    function _registerSystems(LibAsset.SystemApprovalPair[] memory _operators) internal {
        for (uint256 i = 0; i < _operators.length; ++i) {
            if (_operators[i].approved) {
                systems.add(_operators[i].operator);
            } else {
                systems.remove(_operators[i].operator);
            }
        }

        // only emit event if there are actual operators to change.
        if (_operators.length > 0) {
            emit SystemApproved(_operators);
        }
    }
    
    uint256[50] private __gap;
}