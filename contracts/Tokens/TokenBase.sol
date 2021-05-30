// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "../utils/LibConstants.sol";

abstract contract TokenBase is ERC20Upgradeable, ERC165StorageUpgradeable, AccessControlUpgradeable {
    // Create a new role identifier for the minter role. Limiting what each component of a system 
    // can do is known as "principle of least privilege" and is good security practice.
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    /*
     *     bytes4(keccak256('mint(address,uint256)')) == 0x40c10f19
     *     bytes4(keccak256('burn(address,uint256)')) == 0x9dc29fac
     *
     *     => 0x40c10f19 ^ 0x9dc29fac == 0xdd0390b5
     */
    
    /******** Stored Variables ********/
    bytes32 public tokenId;

    /******** Events ********/
    event TokenCreated(address indexed addr, string name, string symbol, bytes32 id, uint256 supply);

    function __TokenBase_init_unchained(uint256 _initialSupply) public initializer {
        // Contract Deployer is now the owner and can set roles
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);

        // mint initial supply of tokens
        _mint(msg.sender, _initialSupply);

        _registerInterface(LibConstants._INTERFACE_ID_TOKENBASE);
        tokenId = keccak256(abi.encodePacked(name(), symbol()));
        emit TokenCreated(address(this), name(), symbol(), tokenId, _initialSupply);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC165StorageUpgradeable, AccessControlUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function mint(address _to, uint256 _amount) public 
    {
        require(hasRole(MINTER_ROLE, msg.sender), "Caller is not a minter");
        _mint(_to, _amount);
    }
    
    function burn(address _from, uint256 _amount) public 
    {
        require(hasRole(BURNER_ROLE, msg.sender), "Caller is not a burner");
        _burn(_from, _amount);
    }
    
    uint256[50] private __gap;
}