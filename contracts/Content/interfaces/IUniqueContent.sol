// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../../libraries/LibRoyalties.sol";
import "../../libraries/LibAsset.sol";

interface IUniqueContent {

    function uri() external view returns (string memory);

    function tokenDataURI(uint256) external view returns (string memory);

    function getRoyalties() external view returns (LibRoyalties.Fees[] memory);

    function mint(address to) external;

    function burn(address to) external;
}