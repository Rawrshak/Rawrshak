// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "./ContentSubsystemBase.sol";
import "./interfaces/IContractUri.sol";

abstract contract HasContractUri is IContractUri, ContentSubsystemBase {

    /******************** Constants ********************/
    /*
     * bytes4(keccak256('contractUri()')) == 0xe8a3d485
     */
    bytes4 private constant _INTERFACE_ID_CONTRACT_URI = 0xe8a3d485;

    /***************** Stored Variables *****************/
    // Contract Information Uri
    string public override contractUri;

    /*********************** Events *********************/
    event ContractUriUpdated(address indexed parent, string uriPrefix);

    /******************** Public API ********************/
    function __HasContractUri_init_unchained(string memory _uri) internal initializer {
        contractUri = _uri;
        _registerInterface(_INTERFACE_ID_CONTRACT_URI);
    }

    /**************** Internal Functions ****************/
    /**
     * @dev Internal function to set the contract Uri
     * @param _uri string Uri prefix to assign
     */
    function _setContractUri(string memory _uri) internal {
        contractUri = _uri;

        emit ContractUriUpdated(_parent(), _uri);
    }
    
    uint256[50] private __gap;
}