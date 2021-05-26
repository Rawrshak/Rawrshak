// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "./ContentSubsystemBase.sol";

abstract contract HasContractUri is ContentSubsystemBase {

    /******************** Constants ********************/
    /*
     * bytes4(keccak256('contractUri()')) == 0xe8a3d485
     */
    bytes4 private constant _INTERFACE_ID_CONTRACT_URI = 0xe8a3d485;

    /***************** Stored Variables *****************/
    // Contract Information Uri
    string internal contractUri;

    /*********************** Events *********************/
    event ContractUriUpdated(address indexed parent, string uriPrefix);

    /******************** Public API ********************/
    function __HasContractUri_init_unchained(string memory _contractUri) internal initializer {
        contractUri = _contractUri;
        _registerInterface(_INTERFACE_ID_CONTRACT_URI);
    }

    /**************** Internal Functions ****************/
    /**
     * @dev Internal function to set the contract Uri
     * @param _contractUri string Uri prefix to assign
     */
    function _setContractUri(string memory _contractUri) internal {
        contractUri = _contractUri;

        emit ContractUriUpdated(_parent(), _contractUri);
    }
    
    uint256[50] private __gap;
}