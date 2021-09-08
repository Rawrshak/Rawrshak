// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

interface ILootboxBase { 
    /******** Mutative Functions ********/
    function registerStorage(address _storage) external;

    function registerContent(address _content) external;

    function managerSetPause(bool _setPause) external;
    
    /*********************** Events *********************/
    event StorageRegistered(address indexed operator, address indexed storageAddress);
    event ContentRegistered(address indexed operator, address indexed content);
}