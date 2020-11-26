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

    /*
     *     bytes4(keccak256('mint(address,uint256)')) == 0x40c10f19
     *     bytes4(keccak256('burn(address,uint256)')) == 0x9dc29fac
     *
     *     => 0x40c10f19 ^ 0x9dc29fac == 0xdd0390b5
     */
    bytes4 private constant _INTERFACE_ID_TOKENBASE = 0xdd0390b5;

    constructor(string memory _name, string memory _symbol, uint256 _initialSupply) public ERC20(_name, _symbol)
    {
        // Contract Deployer is now the owner and can set roles
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);

        // mint initial supply of tokens
        _mint(msg.sender, _initialSupply);

        _registerInterface(_INTERFACE_ID_TOKENBASE);
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
}