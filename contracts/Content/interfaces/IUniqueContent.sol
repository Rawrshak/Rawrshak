// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "./IRoyaltyProvider.sol";

interface IUniqueContent is IERC721Upgradeable, IRoyaltyProvider {

    /******** View Functions ********/
    function creator() external view returns(address);

    function contentContract() external view returns(address);
    
    function id() external view returns(uint256);

    function uri() external view returns (string memory);

    function tokenDataURI(uint256) external view returns (string memory);

    /******** Mutative Functions ********/
    function mint(address to) external;

    function burn(address to) external;
}