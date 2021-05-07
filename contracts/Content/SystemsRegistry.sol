// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "../libraries/LibAsset.sol";
import "./interfaces/ISystemsRegistry.sol";
import "../utils/LibConstants.sol";

contract SystemsRegistry is ISystemsRegistry, AccessControlUpgradeable, ERC165StorageUpgradeable, EIP712Upgradeable {
    using AddressUpgradeable for address;
    using EnumerableSetUpgradeable for *;
    using ECDSAUpgradeable for bytes32;
    using ERC165CheckerUpgradeable for address;
    
    /******************** Constants ********************/
    /*
     * Todo: this
     * bytes4(keccak256('contractRoyalties()')) == 0xFFFFFFFF
     */
    // bytes4 private constant _INTERFACE_ID_SYSTEMS_REGISTER = 0x00000001;
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");

    /***************** Stored Variables *****************/
    address public override parent;

    // Rawrshak system addresses that are approved to interact with this contract
    EnumerableSetUpgradeable.AddressSet private operators;
    EnumerableSetUpgradeable.AddressSet private users;
    mapping(address => uint256) public override userMintNonce;

    /*********************** Events *********************/
    event ParentSet(address parent);
    event UserApproved(address user, bool approved);
    event RegisteredSystemsUpdated(LibAsset.SystemApprovalPair[] operators);

    /********************* Modifiers ********************/
    modifier checkPermissions(bytes32 _role) {
        require(hasRole(_role, msg.sender), "Invalid permissions.");
        _;
    }

    /******************** Public API ********************/
    function __SystemsRegistry_init() public initializer {
        __AccessControl_init_unchained();
        __ERC165Storage_init_unchained();
        __EIP712_init_unchained("MintData", "1");
        _registerInterface(LibConstants._INTERFACE_ID_SYSTEMS_REGISTRY);
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(OWNER_ROLE, _msgSender());
    }

    function setParent(address _parent) external override checkPermissions(OWNER_ROLE) {
        require(_parent.isContract(), "Address is not a contract.");
        require(_parent.supportsInterface(LibConstants._INTERFACE_ID_CONTENT), "Address is not a Content Contract");
        parent = _parent;
        grantRole(OWNER_ROLE, parent);
    }
    
    function isSystemOperatorApproved(address _user, address _operator) external view override returns (bool) {
        return users.contains(_user) && operators.contains(_operator);
    }

    function verifyMint(LibAsset.MintData memory _data, address _caller) external override checkPermissions(OWNER_ROLE) {
        require(_data.tokenIds.length == _data.amounts.length, "Invalid token input");

        // check if _caller is an elevated user. This could be the minter (elevated user), an owner, or a 
        // registered system. Registered systems can mint when it needs to (craft, salvage, lootbox)
        if (!_isOperatorRegistered(_caller) && !hasRole(OWNER_ROLE, _caller)) {
            // this is to prevent minting replay attacks
            require(_data.nonce == userMintNonce[_caller] + 1, "Invalid caller nonce");

            bytes32 hashData = _hashTypedDataV4(LibAsset.hashMintData(_data));
            require(hashData.recover(_data.signature) == _data.signer, "Invalid Signature");

            require(operators.contains(_data.signer), "Invalid Signer");
            
            userMintNonce[_caller]++;
        }
    }

    function isOperatorRegistered(address _operator) external view override returns (bool) {
        return _isOperatorRegistered(_operator);
    }
    
    function registerSystems(LibAsset.SystemApprovalPair[] memory _operators) external override checkPermissions(OWNER_ROLE) {
        for (uint256 i = 0; i < _operators.length; ++i) {
            if (_operators[i].approved) {
                operators.add(_operators[i].operator);
            } else {
                operators.remove(_operators[i].operator);
            }
        }

        emit RegisteredSystemsUpdated(_operators);
    }
    
    function userApprove(address _user, bool _approved) external override checkPermissions(OWNER_ROLE) {
        if (_approved) {
            users.add(_user);
        } else {
            users.remove(_user);
        }

        emit UserApproved(_user, _approved);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControlUpgradeable, ERC165StorageUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }


    /**************** Internal Functions ****************/
    /**
     * @dev Internal function to check whether an operator is pre-approved
     * @param _operator address to check
     */

    function _isOperatorRegistered(address _operator) internal view returns (bool) {
        return operators.contains(_operator);
    }

    uint256[50] private __gap;
}