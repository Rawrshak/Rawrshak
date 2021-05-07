// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

// import "../../libraries/LibRoyalties.sol";
import "../../libraries/LibAsset.sol";
import "./IContentSubsystemBase.sol";

interface ISystemsRegistry is IContentSubsystemBase {

    /******** View Functions ********/
    function userMintNonce(address _user) external view returns (uint256);

    function isSystemOperatorApproved(address _user, address _operator) external view returns (bool);
    
    function isOperatorRegistered(address _operator) external view returns (bool);

    /******** Mutative Functions ********/    
    function verifyMint(LibAsset.MintData memory _data, address _caller) external;
    
    function registerSystems(LibAsset.SystemApprovalPair[] memory _operators) external;
    
    function userApprove(address _user, bool _approved) external;
}