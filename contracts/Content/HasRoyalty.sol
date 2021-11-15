// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../libraries/LibRoyalty.sol";
import "./ContentSubsystemBase.sol";

// Todo: Update Comments and tests
abstract contract HasRoyalty is ContentSubsystemBase {

    /***************** Stored Variables *****************/
    // All asset sales on this contract will pay the contract royalties
    LibRoyalty.Fee internal contractRoyalty;

    // Specific assets can also have their own royalties set
    mapping (uint256 => LibRoyalty.Fee) tokenRoyalty;
    
    /*********************** Events *********************/
    event TokenRoyaltyUpdated(address indexed parent, uint256 indexed tokenId, address receiver, uint24 rate);
    event ContractRoyaltyUpdated(address indexed parent, address receiver, uint24 rate);

    /******************** Public API ********************/
    function __HasRoyalty_init_unchained(address _receiver, uint24 _rate) internal initializer {
        _setContractRoyaltyHelper(_receiver, _rate);
    }

    /**************** Internal Functions ****************/
    /**
     * @dev Internal function to set the contract royalties
     * @param _receiver address to receive the royalties
     * @param _rate royalty fee percentage
     * pair
     */
    function _setContractRoyalty(address _receiver, uint24 _rate) internal {
        _setContractRoyaltyHelper(_receiver, _rate);
        emit ContractRoyaltyUpdated(_parent(), _receiver, _rate);
    }

    /**
     * @dev Internal function to set to a specific token's royalties
     * @param _tokenId uint256 ID of the token to add a royalty
     * @param _receiver address to receive the royalties
     * @param _rate royalty fee percentage
     * pair
     */
    function _setTokenRoyalty(uint256 _tokenId, address _receiver, uint24 _rate) internal {
        // _receiver can be address(0) and _rate can be 0. It indicates to use the contract
        // rates
        require(_rate <= 1e6, "Invalid Fee Rate");
        tokenRoyalty[_tokenId].receiver = _receiver;
        tokenRoyalty[_tokenId].rate = _rate;
        emit TokenRoyaltyUpdated(_parent(), _tokenId, _receiver, _rate);
    }

    /**
     * @dev Internal function to set the royalties for a token
     * @param _tokenId uint256 ID of the token to query
     * If the token id's royalty pair is not set (receiver = address(0)), then contract royalties is returned
     * contractRoyalty and tokenRoyalty[tokenId] can both be null
     */
    function _getRoyalty(uint256 _tokenId) internal view returns (address receiver, uint24 rate) {
        if (tokenRoyalty[_tokenId].receiver != address(0)) {
            return (tokenRoyalty[_tokenId].receiver, tokenRoyalty[_tokenId].rate);
        }
        return (contractRoyalty.receiver, contractRoyalty.rate);
    }

    function _setContractRoyaltyHelper(address _receiver, uint24 _rate) private {
        LibRoyalty.validateFee(_receiver, _rate);
        contractRoyalty.receiver = _receiver;
        contractRoyalty.rate = _rate;
    }
    
    
    uint256[50] private __gap;
}