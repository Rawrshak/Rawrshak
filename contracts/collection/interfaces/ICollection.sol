// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import "../../libraries/LibAsset.sol";
import "./IAccessControlManager.sol";
import "./IContractUri.sol";

interface ICollection is IContractUri, IERC1155Upgradeable {

    /*********************** Events *********************/
    event Mint(address operator, LibAsset.MintData data);
    
    event Burn(address operator, LibAsset.BurnData data);
    
    /******** View Functions ********/
    function totalSupply(uint256 _tokenId) external view returns (uint256);
    
    function maxSupply(uint256 _tokenId) external view returns (uint256);

    function uri(uint256 _tokenId, uint256 _version) external view returns (string memory);

    function contractRoyalty() external view returns (address receiver, uint24 rate);
    
    function userMintNonce(address _user) external view returns (uint256);
    
    function isSystemContract(address _contract) external view returns(bool);

    /******** Mutative Functions ********/

    function mintBatch(LibAsset.MintData memory _data) external;

    function burnBatch(LibAsset.BurnData memory _data) external;
}