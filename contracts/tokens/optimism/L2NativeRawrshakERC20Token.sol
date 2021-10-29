// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Storage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./IL2StandardERC20Latest.sol";

contract L2NativeRawrshakERC20Token is IL2StandardERC20Latest, ERC20, AccessControl {
    // Create a new role identifier for the minter role. Limiting what each component of a system 
    // can do is known as "principle of least privilege" and is good security practice.
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    
    /******** Stored Variables ********/
    address public l2Bridge;
    
    /******** Events ********/
    event TokenCreated(address indexed addr, string name, string symbol, uint256 supply);

    constructor(
        address _l2Bridge,
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply
    )
        ERC20(_name, _symbol)
    {
        // Contract Deployer is now the owner and can set roles
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);

        // Save L2 Bridge (if any)
        l2Bridge = _l2Bridge;

        // L2 Bridge should be able to mint/burn assets
        grantRole(MINTER_ROLE, l2Bridge);
        grantRole(BURNER_ROLE, l2Bridge);

        // mint initial supply, if any
        _mint(msg.sender, _initialSupply);

        emit TokenCreated(address(this), _name, _symbol, _initialSupply);
    }

    function supportsInterface(bytes4 _interfaceId) public override(IERC165, AccessControl) pure returns (bool) {
        bytes4 firstSupportedInterface = bytes4(keccak256("supportsInterface(bytes4)")); // ERC165
        bytes4 secondSupportedInterface = IL2StandardERC20Latest.l1Token.selector
            ^ IL2StandardERC20Latest.mint.selector
            ^ IL2StandardERC20Latest.burn.selector;
        return _interfaceId == firstSupportedInterface || _interfaceId == secondSupportedInterface;
    }

    function mint(address _to, uint256 _amount) public override
    {
        require(hasRole(MINTER_ROLE, msg.sender), "Caller is not a minter");
        _mint(_to, _amount);
        emit Mint(_to, _amount);
    }
    
    function burn(address _from, uint256 _amount) public override 
    {
        require(hasRole(BURNER_ROLE, msg.sender), "Caller is not a burner");
        _burn(_from, _amount);
        emit Burn(_from, _amount);
    }

    function l1Token() external pure override returns(address) {
        return address(0);
    }
}