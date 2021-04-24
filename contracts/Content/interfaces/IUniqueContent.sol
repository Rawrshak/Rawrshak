// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../../libraries/LibRoyalties.sol";
import "../../libraries/LibAsset.sol";

interface IUniqueContent {

    function getRoyalties() external view returns (LibRoyalties.Fees[] memory);

    function ownerOf(uint256) external view returns (address);

    function safeTransferFrom(address from, address to, uint256, bytes memory data) external;

    function safeTransferFrom(address from, address to, uint256) external;

    function transferFrom(address from, address to, uint256) external;

    function approve(address to, uint256) external;

    function getApproved(uint256) external view returns (address);

    function tokenURI(uint256) external view returns (string memory);

    function mint(address to) external;

    function burn(address to) external;
}