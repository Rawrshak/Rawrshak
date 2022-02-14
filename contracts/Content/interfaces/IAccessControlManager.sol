// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../libraries/LibAsset.sol";
import "./IContentSubsystemBase.sol";

interface IAccessControlManager {

    /******** View Functions ********/
    function MINTER_ROLE() external view returns(bytes32);

    function userMintNonce(address _user) external view returns (uint256);

    /******** Mutative Functions ********/    
    function verifyMintDataAndIncrementNonce(LibAsset.MintData memory _data, address _caller) external;
}