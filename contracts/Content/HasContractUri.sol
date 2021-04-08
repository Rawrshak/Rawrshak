// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

contract HasContractURI {

    /***************** Stored Variables *****************/
    // Contract Information URI
    string public contractURI;

    /******************** Public API ********************/
    constructor(string memory _contractURI) {
        contractURI = _contractURI;
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