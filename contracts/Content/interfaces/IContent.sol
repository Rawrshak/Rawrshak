// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import "../../libraries/LibRoyalties.sol";
import "./IRoyaltyProvider.sol";
import "../../libraries/LibAsset.sol";
import "./IAccessControlManager.sol";
import "./IContractUri.sol";

interface IContent is IContractUri, IRoyaltyProvider, IERC1155Upgradeable {

    /*********************** Events *********************/
    event Mint(address operator, LibAsset.MintData data);
    
    event Burn(address operator, LibAsset.BurnData data);
    
    /******** View Functions ********/
    function name() external view returns (string memory);
    
    function symbol() external view returns (string memory);

    function supply(uint256 _tokenId) external view returns (uint256);
    
    function maxSupply(uint256 _tokenId) external view returns (uint256);

    function uri(uint256 _tokenId, uint256 _version) external view returns (string memory);

    /******** Mutative Functions ********/

    function mintBatch(LibAsset.MintData memory _data) external;

    function burnBatch(LibAsset.BurnData memory _data) external;
}