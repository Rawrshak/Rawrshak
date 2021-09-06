// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;
import "../../../libraries/LibAsset.sol";

interface IBurnFees {
    function isElevatedCaller(address _caller) external view returns (bool);
    
    function getBurnFees(uint256 _tokenId) external view returns(LibAsset.Fee[] memory fees);
}