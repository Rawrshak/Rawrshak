// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "./EscrowBase.sol";
import "../utils/LibConstants.sol";

contract EscrowDistributions is EscrowBase {
    using AddressUpgradeable for address;
    
    /******************** Constants ********************/
    /***************** Stored Variables *****************/
    mapping(address => mapping(address => uint256)) public claimableTokensByOwner;
    
    /*********************** Events *********************/
    /********************* Modifiers ********************/
    /******************** Public API ********************/
    function __EscrowERC20_init() public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
    }
    
    function deposit(
        address to,
        address tokenAddr,
        uint256 amount
    ) external onlyOwner {
        require(
            ERC165CheckerUpgradeable.supportsInterface(tokenAddr, LibConstants._INTERFACE_ID_TOKENBASE),
            "Invalid erc 20 contract interface.");
        require(tokenAddr != address(0), "Invalid address");

        // No need to do checks. The exchange contracts will do the checks.
        claimableTokensByOwner[to][tokenAddr] = SafeMathUpgradeable.add(claimableTokensByOwner[to][tokenAddr], amount);
    }

    function claim(
        address to,
        address tokenAddr
    ) external onlyOwner {
        require(claimableTokensByOwner[to][tokenAddr] > 0, "Tokens were already claimed.");

        uint256 amount = claimableTokensByOwner[to][tokenAddr];
        claimableTokensByOwner[to][tokenAddr] = 0;
             
        IERC20Upgradeable(tokenAddr).transferFrom(address(this), to, amount);
    }

    /**************** Internal Functions ****************/

    uint256[50] private __gap;
}