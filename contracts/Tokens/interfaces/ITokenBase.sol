// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

interface ITokenBase { 
    /******** Mutative Functions ********/
    function mint(address _to, uint256 _amount) external;
    function burn(address _from, uint256 _amount) external;
    
    /*********************** Events *********************/
}