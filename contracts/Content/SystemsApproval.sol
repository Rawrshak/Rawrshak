// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "./LibAsset.sol";

abstract contract SystemsApproval is ERC165StorageUpgradeable {
        
    /***************** Stored Variables *****************/
    // Rawrshak system addresses that are approved to interact with this copntract
    mapping(address => bool) private systemApproval;

    /*********************** Events *********************/
    event SystemApproved(LibAsset.SystemApprovalPair[] _operators);

    /**************** Internal Functions ****************/
    function _isOperatorApprovedForAll(address _operator) internal view returns (bool) {
        return systemApproval[_operator];
    }

    /**
     * @dev Internal function to approve a pre-approve system address
     * @param _operators [address,bool] addresses of system contracts to be approved
     */
    function _setSystemApproval(LibAsset.SystemApprovalPair[] memory _operators) internal {
        for (uint256 i = 0; i < _operators.length; ++i) {
            systemApproval[_operators[i].operator] = _operators[i].approved;
        }
        emit SystemApproved(_operators);
    }
    
    uint256[50] private __gap;
}