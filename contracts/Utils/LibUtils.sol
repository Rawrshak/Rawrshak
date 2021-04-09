// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

library LibUtils {
    
    /******** Helper Functions ********/
    // generate random number 
    function random(uint256 modulus) public view returns (uint256) {
        return uint(keccak256(abi.encodePacked(block.timestamp, msg.sig))) % modulus;
    }
    
    // Get a hashed Id
    function getId(address contractAddress, uint256 id) public pure returns(uint256) {
        return uint256(keccak256(abi.encodePacked(contractAddress, id)));
    }
}