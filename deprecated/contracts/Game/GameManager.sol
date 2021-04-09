// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Storage.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./Game.sol";
import "../interfaces/IGameManager.sol";
import "../factory/GameFactory.sol";
import "../../utils/Constants.sol";

contract GameManager is AccessControl, Ownable, IGameManager, ERC165Storage {
    using EnumerableSet for EnumerableSet.UintSet;
    using Address for *;
    using SafeMath for *;
    using ERC165Checker for *;

    /******** Constants ********/
    // These addresses should probably belong to the server api that the game 
    // and developer app interfaces with.
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    
    // Todo: update this interface ID
    /*
     *     bytes4(keccak256('getGamePayableAddress()')) == 0x27da96f6
     *     bytes4(keccak256('contains(uint256)')) == 0xc34052e0
     *     bytes4(keccak256('length()')) == 0x1f7b6d32
     *     bytes4(keccak256('getAllItems()')) == <-TODO: this
     *     bytes4(keccak256('getTotalSupply(uint256)')) == 0x92ab723e
     *     bytes4(keccak256('getMaxSupply(uint256)')) == 0x5e495d74
     *     bytes4(keccak256('getCreatorAddress(uint256)')) == 0xa30b4db9
     *     bytes4(keccak256('setGamePayableAddress(address)')) == 0xd1a6aab5
     *     bytes4(keccak256('createItem(address,uint256,uint256)')) == 0x57baf0fb
     *     bytes4(keccak256('createItemBatch(address,uint256[],uint256[])')) == 0x00ff4688
     *     bytes4(keccak256('mint(address,uint256,uint256)')) == 0x156e29f6
     *     bytes4(keccak256('mintBatch(address,uint256[],uint256[])')) == 0xd81d0a15
     *     bytes4(keccak256('burn(address,uint256,uint256)')) == 0xf5298aca
     *     bytes4(keccak256('burnBatch(address,uint256[],uint256[])')) == 0x6b20c454
     *
     *     => 0x27da96f6 ^ 0xc34052e0 ^ 0x1f7b6d32 ^ 0x4ba1d6aa
     *      ^ 0x92ab723e ^ 0x5e495d74 ^ 0xa30b4db9 ^ 0xd1a6aab5
     *      ^ 0x57baf0fb ^ 0x00ff4688 ^ 0x156e29f6 ^ 0xd81d0a15
     *      ^ 0xf5298aca ^ 0x6b20c454 == 0x0a306cc6
     */

    /******** Stored Variables ********/
    address public gameAddr;

    /******** Events ********/
    event GlobalItemRegistryStored(address, address, bytes4);

    /******** Modifiers ********/
    modifier checkPermissions(bytes32 _role) {
        require(
            hasRole(_role, msg.sender),
            "Caller does not have the necessary permissions."
        );
        _;
    }

    /******** Public API ********/
    // url: "https://game.example/api/item/{id}.json"
    constructor(address _owner) {
        // Contract Deployer is now the owner and can set roles
        _setupRole(DEFAULT_ADMIN_ROLE, _owner);
        _setupRole(MINTER_ROLE, _owner);
        _setupRole(BURNER_ROLE, _owner);

        _registerInterface(Constants._INTERFACE_ID_IGAMEMANAGER);
        transferOwnership(_owner);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControl, ERC165Storage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function setUri(string calldata _newUri) external override onlyOwner {
        game().setUri(_newUri);
    }

    function generateGameContract(address _gameFactoryAddress, string calldata _url) external override onlyOwner {
        require(
            ERC165Checker.supportsInterface(_gameFactoryAddress, Constants._INTERFACE_ID_IGAMEFACTORY),
            "Caller does not support Interface."
        );

        uint256 id;
        (gameAddr, id)  = GameFactory(_gameFactoryAddress).createGameContract(_url);
    }

    function setGlobalItemRegistryAddr(address _addr) external override onlyOwner {
        require(Address.isContract(_addr), "Address not valid");
        require(
            ERC165Checker.supportsInterface(_addr, Constants._INTERFACE_ID_IGLOBALITEMREGISTRY),
            "Caller does not support Interface."
        );
        require(gameAddr != address(0), "Game Contract not created yet.");
        game().setGlobalItemRegistryAddr(_addr);

        emit GlobalItemRegistryStored(address(this), _addr, Constants._INTERFACE_ID_IGAMEMANAGER);
    }

    // Create New Item
    function createItem(address payable _creatorAddress, uint256 _id, uint256 _maxSupply) external override onlyOwner {
        require(!game().contains(_id), "Item already exists.");
        require(_creatorAddress != address(0), "Invalid Address");
        
        // Add item to item storage
        game().createItem(_creatorAddress, _id, _maxSupply);
        
        // mint max supply if there is a max supply
        if (_maxSupply > 0) {
            game().mint(_creatorAddress, _id, _maxSupply);
        }
    }

    function createItemBatch(
        address payable _creatorAddress,
        uint256[] calldata _ids,
        uint256[] calldata _maxSupplies
    )
        external
        override
        onlyOwner
    {
        require(_creatorAddress != address(0), "Invalid Address");
        require(_ids.length == _maxSupplies.length, "IDs and Max Supply array size do not match");
        for (uint256 i = 0; i < _ids.length; ++i) {
            require(!game().contains(_ids[i]), "Item already exists.");
        }

        game().createItemBatch(_creatorAddress, _ids, _maxSupplies);
        game().mintBatch(_creatorAddress, _ids, _maxSupplies);
    }

    function mint(address _receivingAddress, uint256 _itemId, uint256 _amount)
        external
        override
        checkPermissions(MINTER_ROLE)
    {
        require(game().contains(_itemId), "Item does not exist");
        require(_receivingAddress != address(0), "Invalid address");

        (, uint256 maxSupply) = game().getItemInfo(_itemId);
        require(maxSupply == 0 || maxSupply >= SafeMath.add(game().currentSupply(_itemId), _amount), "Supply cannot be increased");

        game().mint(_receivingAddress, _itemId, _amount);
    }

    // mint several items to a single address
    function mintBatch(
        address _receivingAddress,
        uint256[] calldata _itemIds,
        uint256[] calldata _amounts
    )
        external
        override
        checkPermissions(MINTER_ROLE)
    {
        require(_itemIds.length == _amounts.length, "item arrays don't match.");
        require(_receivingAddress != address(0), "Invalid address");
        for (uint256 i = 0; i < _itemIds.length; ++i) {
            require(game().contains(_itemIds[i]), "An item doesn't exist.");
        }

        for (uint i = 0; i < _itemIds.length; i++) {
            (, uint256 maxSupply) = game().getItemInfo(_itemIds[i]);
            require(
                maxSupply == 0 || maxSupply >= SafeMath.add(game().currentSupply(_itemIds[i]), _amounts[i]),
                "Supply cannot be increased"
            );
        }
        game().mintBatch(_receivingAddress, _itemIds, _amounts);
    }

    function burn(address _account, uint256 _itemId, uint256 _amount)
        external
        override
        checkPermissions(BURNER_ROLE)
    {
        require(game().contains(_itemId), "Item does not exist");
        require(_account != address(0), "Invalid address");

        game().burn(_account, _itemId, _amount);
    }

    function burnBatch(
        address _account,
        uint256[] calldata _itemIds,
        uint256[] calldata _amounts
    )
        external
        override
        checkPermissions(BURNER_ROLE)
    {
        require(_itemIds.length == _amounts.length, "item arrays don't match.");
        require(_account != address(0), "Invalid address");

        game().burnBatch(_account, _itemIds, _amounts);
    }

    // internal 
    function game() internal view returns(Game) {
        return Game(gameAddr);
    }
}