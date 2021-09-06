// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "../libraries/LibAsset.sol";
import "./ContentSubsystemBase.sol";

// Todo: Create HasBurnFees tests
abstract contract HasBurnFees is ContentSubsystemBase {
    using AddressUpgradeable for address;
    using ERC165CheckerUpgradeable for address;

    /******************** Constants ********************/
    /*
     * bytes4(keccak256('contractBurnFees()')) == 0xf4d93d58
     */
    bytes4 private constant _INTERFACE_ID_BURN_FEES = 0xf4d93d58;

    /***************** Stored Variables *****************/
    // All asset burns that where the caller doesn't have a special role on this contract will pay the contract burn fee
    LibAsset.Fee[] public contractBurnFees;

    // Specific assets can also have their own burn fees set
    mapping (uint256 => LibAsset.Fee[]) tokenBurnFees;
    
    /*********************** Events *********************/
    event TokenBurnFeeUpdated(address indexed parent, uint256 indexed tokenId, LibAsset.Fee[] fees);
    event ContractBurnFeeUpdated(address indexed parent, LibAsset.Fee[] fees);

    /******************** Public API ********************/
    function __HasBurnFees_init_unchained() internal initializer {
        // Note: Contract Burn Fees are set to nothing by default.
        _registerInterface(_INTERFACE_ID_BURN_FEES);
    }

    /**************** Internal Functions ****************/
    /**
     * @dev Internal function to set the contract burn fees
     * @param _fees LibAsset.Fee[] array containing the account and burn fee pair
     */
    function _setContractBurnFees(LibAsset.Fee[] memory _fees) internal {
        LibAsset.validateFees(_fees);
        delete contractBurnFees;
        for (uint256 i = 0; i < _fees.length; ++i) {
            contractBurnFees.push(_fees[i]);
        }
        emit ContractBurnFeeUpdated(_parent(), _fees);
    }

    /**
     * @dev Internal function to set to a specific token's burn fees
     * @param _tokenId uint256 ID of the token to add a burn fee
     * @param _fees LibAsset.Fee[] array containing the account and burn fee pair
     */
    function _setTokenBurnFees(uint256 _tokenId, LibAsset.Fee[] memory _fees) internal {
        LibAsset.validateFees(_fees);
        delete tokenBurnFees[_tokenId];
        for (uint256 i = 0; i < _fees.length; ++i) {
            tokenBurnFees[_tokenId].push(_fees[i]);
        }
        emit TokenBurnFeeUpdated(_parent(), _tokenId, _fees);
    }

    /**
     * @dev Internal function to set the fees for a token
     * @param _tokenId uint256 ID of the token to query
     * If the token id does not have a burn fee, the contract burn fee is returned.
     * contractBurnFees and tokenBurnFees[tokenId] can both be null
     */
    function _getBurnFee(uint256 _tokenId) internal view returns(LibAsset.Fee[] memory) {
        if (tokenBurnFees[_tokenId].length == 0) {
            return (contractBurnFees);
        }
        return (tokenBurnFees[_tokenId]);
    }
    
    uint256[50] private __gap;
}