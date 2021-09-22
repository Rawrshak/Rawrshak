// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../libraries/LibRoyalties.sol";
import "./ContentSubsystemBase.sol";

// Todo: Update Comments and tests
abstract contract HasRoyalties is ContentSubsystemBase {

    /******************** Constants ********************/
    /*
     * bytes4(keccak256('contractRoyalty()')) == 0x0982790e
     */
    bytes4 private constant INTERFACE_ID_ROYALTIES = 0x0982790e;

    /***************** Stored Variables *****************/
    // All asset sales on this contract will pay the contract royalties
    LibRoyalties.Fees public contractRoyalty;

    // Specific assets can also have their own royalties set
    mapping (uint256 => LibRoyalties.Fees) tokenRoyalty;
    
    /*********************** Events *********************/
    event TokenRoyaltyUpdated(address indexed parent, uint256 indexed tokenId, address receiver, uint24 rate);
    event ContractRoyaltyUpdated(address indexed parent, address receiver, uint24 rate);

    /******************** Public API ********************/
    function __HasRoyalties_init_unchained(address _receiver, uint24 _rate) internal initializer {
        _setContractRoyalty(_receiver, _rate);
        _registerInterface(INTERFACE_ID_ROYALTIES);
    }

    /**************** Internal Functions ****************/
    /**
     * @dev Internal function to set the contract royalties
     * @param _receiver LibRoyalties.Fees[] array containing the account and percentage royalties
     * @param _rate LibRoyalties.Fees[] array containing the account and percentage royalties
     * pair
     */
    function _setContractRoyalty(address _receiver, uint24 _rate) internal {
        LibRoyalties.validateFees(_receiver, _rate);
        contractRoyalty.account = _receiver;
        contractRoyalty.rate = _rate;
        emit ContractRoyaltyUpdated(_parent(), _receiver, _rate);
    }

    /**
     * @dev Internal function to set to a specific token's royalties
     * @param _tokenId uint256 ID of the token to add a royalty
     * @param _receiver LibRoyalties.Fees[] array containing the account and percentage royalties
     * @param _rate LibRoyalties.Fees[] array containing the account and percentage royalties
     * pair
     */
    function _setTokenRoyalty(uint256 _tokenId, address _receiver, uint24 _rate) internal {
        LibRoyalties.validateFees(_receiver, _rate);
        tokenRoyalty[_tokenId].account = _receiver;
        tokenRoyalty[_tokenId].rate = _rate;
        emit TokenRoyaltyUpdated(_parent(), _tokenId, _receiver, _rate);
    }

    /**
     * @dev Internal function to set the royalties for a token
     * @param _tokenId uint256 ID of the token to query
     * If the token id does not have royalties, the contract royalties is returned.
     * contractRoyalty and tokenRoyalty[tokenId] can both be null
     */
    function _getRoyalty(uint256 _tokenId) internal view returns (address receiver, uint24 rate) {
        if (tokenRoyalty[_tokenId].account != address(0)) {
            return (tokenRoyalty[_tokenId].account, tokenRoyalty[_tokenId].rate);
        }
        return (contractRoyalty.account, contractRoyalty.rate);
    }
    
    uint256[50] private __gap;
}