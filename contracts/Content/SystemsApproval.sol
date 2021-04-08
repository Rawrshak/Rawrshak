// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts/utils/introspection/ERC165Storage.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

abstract contract SystemsApproval is ERC1155, ERC165Storage {
    
    /******************** Constants ********************/
    /*
     * bytes4(keccak256('supportsInterface(bytes4)')) == 0x01ffc9a7
     * bytes4(keccak256('isApprovedForAll(address,address)')) == 0xe985e9c5
     */
    bytes4 private constant _INTERFACE_ID_SYSTEMS_APPROVAL = 0xe87a2062;
    
    /***************** Stored Variables *****************/
    // Rawrshak system addresses that are approved to interact with this copntract
    mapping(address => bool) private systemApproval;

    /*********************** Events *********************/
    event SystemApproved(address indexed operator, bool hasApproved);

    /******************** Public API ********************/
    constructor() {
        _registerInterface(_INTERFACE_ID_SYSTEMS_APPROVAL);
    }

    function supportsInterface(bytes4 _interfaceId) public view virtual override(ERC1155, ERC165Storage) returns (bool) {
        return super.supportsInterface(_interfaceId);
    }

    function isApprovedForAll(address _owner, address _operator) public virtual override view returns (bool) {
        return systemApproval[_operator] || super.isApprovedForAll(_owner, _operator);
    }

    /**************** Internal Functions ****************/
    /**
     * @dev Internal function to approve a pre-approve system address
     * @param _operator address of the system contract
     * @param _hasApproval bool whether to approve or unapprove a system
     */
    function _setSystemApproval(address _operator, bool _hasApproval) internal {
        systemApproval[_operator] = _hasApproval;
        emit SystemApproved(_operator, _hasApproval);
    }
}