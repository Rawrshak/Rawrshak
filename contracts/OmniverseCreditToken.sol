// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract OVCToken is ERC20, AccessControl
{
    // Create a new role identifier for the minter role. Limiting what each component of a system 
    // can do is known as "principle of least privilege" and is good security practice.
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    constructor(uint256 initialSupply) public ERC20("Omniverse Credits", "OVC")
    {
        // Contract Deployer is now the owner and can set roles
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);

        // mint initial supply of tokens
        _mint(msg.sender, initialSupply);
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