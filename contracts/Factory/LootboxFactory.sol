// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/introspection/ERC165.sol";
import "@openzeppelin/contracts/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../Game/Lootbox.sol";

library LootboxDeployer {
    function deployLootbox(uint256 _id, address _itemRegistryAddr, string memory _url) public returns(address lootbox) {
        lootbox = address(new Lootbox(_id, _itemRegistryAddr, _url));
    } 
    
    function transferOwnership(address _contractAddr, address _newOwner) public {
        IDatabaseContract(_contractAddr).setManagerAddress(_newOwner);
        Ownable(_contractAddr).transferOwnership(_newOwner);
    }
}

contract LootboxFactory is ERC165 {
    using ERC165Checker for *;
    using LootboxDeployer for *;

    /******** Constants ********/
    bytes4 private constant _INTERFACE_ID_ILOOTBOXFACTORY = 0x0000000B;
    bytes4 private constant _INTERFACE_ID_IGLOBALITEMREGISTRY = 0x00000004;
    bytes4 private constant _INTERFACE_ID_ILOOTBOXMANAGER = 0x0000000A;

    /******** Stored Variables ********/
    address itemRegistryAddr;
    address[] public lootboxAddresses;
    
    /******** Events ********/
    event GlobalItemRegistryStored(address, address, bytes4);
    event LootboxContractCreated(uint256 id, address contractAddr, address owner);

    /******** Public API ********/
    constructor() public {
        _registerInterface(_INTERFACE_ID_ILOOTBOXFACTORY);
    }

    function setGlobalItemRegistryAddr(address _addr) external {
        require(Address.isContract(_addr), "Address not valid");
        require(
            ERC165Checker.supportsInterface(_addr, _INTERFACE_ID_IGLOBALITEMREGISTRY),
            "Caller does not support Interface."
        );
        itemRegistryAddr = _addr;
        
        emit GlobalItemRegistryStored(address(this), _addr, _INTERFACE_ID_ILOOTBOXFACTORY);
    }

    /******** Mutative Functions ********/
    function createLootboxContract(string calldata _url) external returns(address contractAddr, uint256 contractId) {
        require(
            ERC165Checker.supportsInterface(msg.sender, _INTERFACE_ID_ILOOTBOXMANAGER),
            "Caller not valid Contract."
        );
        require(itemRegistryAddr != address(0), "Registry not set.");
        
        contractId = lootboxAddresses.length;
        contractAddr = LootboxDeployer.deployLootbox(contractId, itemRegistryAddr, _url);
        LootboxDeployer.transferOwnership(contractAddr, msg.sender);

        lootboxAddresses.push(contractAddr);

        emit LootboxContractCreated(contractId, contractAddr, msg.sender);
    }
}