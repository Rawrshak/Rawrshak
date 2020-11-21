// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/introspection/ERC165.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract TokenBase is ERC20, ERC165, AccessControl
{
    // Create a new role identifier for the minter role. Limiting what each component of a system 
    // can do is known as "principle of least privilege" and is good security practice.
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    /*     Todo: When creating the ITokenBase interface, based off of this pattern below,
     *           generate the _INTERFACE_ID_TOKEN_BASE
     *     bytes4(keccak256('mint(address, uint256)')) == 0x********
     *     bytes4(keccak256('burn(address, uint256)')) == 0x********
     *
     *     => 0x******** ^ 0x******** == 0x********
     */
    // bytes4 private constant _INTERFACE_ID_ERC721 = 0x********;


    constructor(string memory name, string memory symbol, uint256 initialSupply) public ERC20(name, symbol)
    {
        // Contract Deployer is now the owner and can set roles
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);

        // mint initial supply of tokens
        _mint(msg.sender, initialSupply);

        // Todo: uncomment when creating the ITokenBase interface
        // register the Token
        // _registerInterface(_INTERFACE_ID_ERC721);
    }

    function mint(address to, uint256 amount) public 
    {
        require(hasRole(MINTER_ROLE, msg.sender), "Caller is not a minter");
        _mint(to, amount);
    }
    
    function burn(address from, uint256 amount) public 
    {
        require(hasRole(BURNER_ROLE, msg.sender), "Caller is not a burner");
        _burn(from, amount);
    }
}