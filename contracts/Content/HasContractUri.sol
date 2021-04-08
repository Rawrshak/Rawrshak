// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts/utils/introspection/ERC165Storage.sol";

contract HasContractURI is ERC165Storage {

    /******************** Constants ********************/
    /*
     * bytes4(keccak256('contractURI()')) == 0xe8a3d485
     */
    bytes4 private constant _INTERFACE_ID_CONTRACT_URI = 0xe8a3d485;

    /***************** Stored Variables *****************/
    // Contract Information URI
    string public contractURI;

    /******************** Public API ********************/
    constructor(string memory _contractURI) {
        contractURI = _contractURI;
        _registerInterface(_INTERFACE_ID_CONTRACT_URI);
    }

    /**************** Internal Functions ****************/
    /**
     * @dev Internal function to set the contract URI
     * @param _contractURI string URI prefix to assign
     */
    function _setContractURI(string memory _contractURI) internal {
        contractURI = _contractURI;
    }
}