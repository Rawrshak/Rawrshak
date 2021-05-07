// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../../libraries/LibRoyalties.sol";

interface IRoyaltyProvider {

    /******** View Functions ********/
    function getRoyalties(uint256 _tokenId) external view returns (LibRoyalties.Fees[] memory);
    
}