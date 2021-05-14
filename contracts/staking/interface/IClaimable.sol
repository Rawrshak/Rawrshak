// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

interface IClaimable {

    /******** View Functions ********/
    function supply() external view returns(uint256);

    function remaining() external view returns(uint256);

    /******** Mutative Functions ********/
    function claim(uint256 _amount, address _recepient) external;

    /*********************** Events *********************/
    event Claimed(address receipent, uint256 amount, uint256 remaining);
}