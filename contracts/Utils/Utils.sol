// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

library Utils {
    
    /******** Helper Functions ********/
    // generate random number 
    function random(uint256 modulus) public view returns (uint256) {
        return uint(keccak256(abi.encodePacked(block.timestamp, msg.sig))) % modulus;
    }
    
    // Get a hashed Id
    function getId(address contractAddress, uint256 id) public pure returns(uint256) {
        return uint256(keccak256(abi.encodePacked(contractAddress, id)));
    }

    /******** Shared Constants ********/
    bytes4 constant _INTERFACE_ID_IGAME = 0x00000001;
    bytes4 constant _INTERFACE_ID_IGAMEMANAGER = 0x00000002;
    bytes4 constant _INTERFACE_ID_IGAMEFACTORY = 0x00000003;
    bytes4 constant _INTERFACE_ID_IGLOBALITEMREGISTRY = 0x00000004;
    bytes4 constant _INTERFACE_ID_ICRAFTING = 0x00000005;
    bytes4 constant _INTERFACE_ID_ICRAFTINGMANAGER= 0x00000006;
    bytes4 constant _INTERFACE_ID_ICRAFTINGFACTORY = 0x00000007;
    bytes4 constant _INTERFACE_ID_TOKENBASE = 0x00000008;
    bytes4 constant _INTERFACE_ID_ILOOTBOX = 0x00000009;
    bytes4 constant _INTERFACE_ID_ILOOTBOXMANAGER = 0x0000000A;
    bytes4 constant _INTERFACE_ID_ILOOTBOXFACTORY = 0x0000000B;
    bytes4 constant _INTERFACE_ID_IEXCHANGE = 0x0000000C;
    bytes4 constant _INTERFACE_ID_IMANAGERFACTORY = 0x0000000D;
}