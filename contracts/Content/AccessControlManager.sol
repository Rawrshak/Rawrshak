// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "../utils/EIP712Extended.sol";
import "../libraries/LibAsset.sol";
import "./interfaces/IAccessControlManager.sol";
import "./ContentSubsystemBase.sol";
import "hardhat/console.sol";

contract AccessControlManager is IAccessControlManager, ContentSubsystemBase, AccessControlUpgradeable, EIP712Extended {
    using EnumerableSetUpgradeable for *;
    using ECDSAUpgradeable for bytes32;
    
    /******************** Constants ********************/
    /*
     * IAccessControlManager Interface: 0x41f2c5c6
     * IAccessControlUpgradeable Interface: 0x7965db0b
     */
    // bytes4 private constant INTERFACE_ID_ACCESS_CONTROL_MANAGER = 0xDC54FD6E;
    bytes32 public constant override MINTER_ROLE = keccak256("MINTER_ROLE");

    /***************** Stored Variables *****************/
    // Rawrshak system addresses that are approved to interact with this contract
    mapping(address => uint256) public override userMintNonce;

    /******************** Public API ********************/
    function initialize() public initializer {
        __AccessControl_init_unchained();
        __ERC165Storage_init_unchained();
        __EIP712Extended_init_unchained("MintData", "1");
        __AccessControlManager_init_unchained();
        __ContentSubsystemBase_init_unchained();
    }
    
    function __AccessControlManager_init_unchained() internal initializer
    {
        _registerInterface(type(IAccessControlManager).interfaceId);
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }
    
    /**
    * @dev assigns the address of contentParent and
    * transfers role of DEFAULT_ADMIN_ROLE to the _newParent parameter
    * @param _newParent address to be granted roles
    */
    
    function setParent(address _newParent) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        _setParent(_newParent);
        grantRole(DEFAULT_ADMIN_ROLE, _newParent);
        renounceRole(DEFAULT_ADMIN_ROLE, _msgSender());

        emit ParentSet(_newParent);
    }

    /**
    * @dev verifies whether the caller has permission to mint an asset
    * @param _data LibAsset.MintData structure object
    * @param _caller address of who called this function
    */
    function verifyMint(LibAsset.MintData memory _data, address _caller) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_data.tokenIds.length == _data.amounts.length, "Invalid token input");

        // if the caller is the owner address or has a minter role (granted by the owner), continue on.
        if (hasRole(MINTER_ROLE, _caller) || hasRole(DEFAULT_ADMIN_ROLE, _caller)) {
            return;
        }

        // Otherwise, we need to verify who signed the data

        // this is to prevent minting replay attacks
        require(_data.nonce == userMintNonce[_data.to] + 1, "Invalid caller nonce");

        // Verifying Contract must be there content contract parent of this control manager
        bytes32 hashData = _hashTypedDataV4(LibAsset.hashMintData(_data), _parent());
        require(hashData.recover(_data.signature) == _data.signer, "Invalid Signature");

        // Check if signer has the correct role
        require(hasRole(MINTER_ROLE, _data.signer) || hasRole(DEFAULT_ADMIN_ROLE, _data.signer), "Invalid Signer");
        
        // Increment user nonce
        userMintNonce[_data.to]++;
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControlUpgradeable, ERC165StorageUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**************** Internal Functions ****************/

    uint256[50] private __gap;
}