// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IClaimable {

    /******** View Functions ********/
    function supply() external view returns(uint256);

    function remaining() external view returns(uint256);

    /******** Mutative Functions ********/
    function claim(uint256 _amount, address _recepient) external;

    /*********************** Events *********************/
    event Claimed(address indexed receipent, uint256 amount, uint256 remaining);
}