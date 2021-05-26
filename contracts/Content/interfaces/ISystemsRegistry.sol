// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

// import "../../libraries/LibRoyalties.sol";
import "../../libraries/LibAsset.sol";
import "./IContentSubsystemBase.sol";

interface ISystemsRegistry {

    /******** View Functions ********/
    function userMintNonce(address _user) external view returns (uint256);

    function isOperatorApproved(address _user, address _operator) external view returns (bool);
    
    function userApproval(address _user) external view returns (bool);
    
    function isOperatorRegistered(address _operator) external view returns (bool);

    /******** Mutative Functions ********/    
    function verifyMint(LibAsset.MintData memory _data, address _caller) external;
    
    function registerSystems(LibAsset.SystemApprovalPair[] memory _operators) external;
    
    function userApprove(address _user, bool _approved) external;

    /*********************** Events *********************/
    event UserApproved(address indexed contentContract, address indexed user, bool approved);
    event RegisteredSystemsUpdated(address indexed contentContract, LibAsset.SystemApprovalPair[] operators);
}