// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "./StorageBase.sol";
import "./interfaces/IErc20Escrow.sol";

contract Erc20Escrow is IErc20Escrow, StorageBase {
    using AddressUpgradeable for address;
    
    /***************** Stored Variables *****************/
    address public override token;
    mapping(uint256 => uint256) public override escrowedTokensByOrder;
    mapping(address => uint256) public override claimableTokensByOwner;

    /******************** Public API ********************/
    function __Erc20Escrow_init(address _token) public initializer {
        require(
            _token.isContract() && 
            ERC165CheckerUpgradeable.supportsInterface(_token, LibInterfaces.INTERFACE_ID_TOKENBASE),
            "Invalid erc 20 contract interface.");
        __Context_init_unchained();
        __ERC165_init_unchained();
        __AccessControl_init_unchained();
        __StorageBase_init_unchained();
        _registerInterface(LibInterfaces.INTERFACE_ID_ERC20_ESCROW);
        
        token = _token;
    }
    
    function deposit(
        uint256 _orderId,
        address _sender,
        uint256 _amount
    ) external override onlyRole(MANAGER_ROLE) {
        // No need to do checks. The exchange contracts will do the checks.
        escrowedTokensByOrder[_orderId] = escrowedTokensByOrder[_orderId] + _amount;
        
        // Send the Token Amount to the Escrow
        IERC20Upgradeable(token).transferFrom(_sender, address(this), _amount);
    }

    // This is specificly used for royalties
    function withdraw(uint256 _orderId, address _receiver, uint256 _amount) external override onlyRole(MANAGER_ROLE) {
        require(escrowedTokensByOrder[_orderId] >= _amount, "Invalid amount");

        escrowedTokensByOrder[_orderId] = escrowedTokensByOrder[_orderId] - _amount;
        IERC20Upgradeable(token).transfer(_receiver, _amount);
    }
    
    function depositRoyalty(
        address _sender,
        address _owner,
        uint256 _amount
    ) external override onlyRole(MANAGER_ROLE) {
        // No need to do checks. The exchange contracts will do the checks.
        claimableTokensByOwner[_owner] = claimableTokensByOwner[_owner] + _amount;
        IERC20Upgradeable(token).transferFrom(_sender, address(this), _amount);
    }
    
    function transferRoyalty(
        uint256 _orderId,
        address _owner,
        uint256 _amount
    ) external override onlyRole(MANAGER_ROLE) {        
        require(escrowedTokensByOrder[_orderId] >= _amount, "Invalid amount");

        // No need to do checks. The exchange contracts will do the checks.
        escrowedTokensByOrder[_orderId] = escrowedTokensByOrder[_orderId] - _amount;
        claimableTokensByOwner[_owner] = claimableTokensByOwner[_owner] + _amount;
    }

    function depositPlatformRoyalty(address _sender, address _feePool, uint256 _amount) external override onlyRole(MANAGER_ROLE) {
        // No need to do checks. The exchange contracts will do the checks.
        IERC20Upgradeable(token).transferFrom(_sender, _feePool, _amount);
    }

    function transferPlatformRoyalty(uint256 _orderId, address _feePool, uint256 _amount) external override onlyRole(MANAGER_ROLE) {
        // No need to do checks. The exchange contracts will do the checks.
        escrowedTokensByOrder[_orderId] = escrowedTokensByOrder[_orderId] - _amount;
        IERC20Upgradeable(token).transfer(_feePool, _amount);
    }

    function claim(address _owner) external override onlyRole(MANAGER_ROLE) {
        require(claimableTokensByOwner[_owner] > 0, "Tokens were already claimed.");

        uint256 amount = claimableTokensByOwner[_owner];
        claimableTokensByOwner[_owner]= 0;
        
        IERC20Upgradeable(token).transfer(_owner, amount);
    }

    /**************** Internal Functions ****************/

    uint256[50] private __gap;
}