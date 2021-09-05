// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

// import "../../libraries/LibRoyalties.sol";
import "../../libraries/LibAsset.sol";
import "./IContentSubsystemBase.sol";

interface ISystemsRegistry {

    /******** View Functions ********/
    function MINTER_ROLE() external view returns(bytes32);

    function userMintNonce(address _user) external view returns (uint256);

    /******** Mutative Functions ********/    
    function verifyMint(LibAsset.MintData memory _data, address _caller) external;

    /*********************** Events *********************/
    event UserApproved(address indexed contentContract, address indexed user, bool approved);
    event RegisteredSystemsUpdated(address indexed contentContract, LibAsset.SystemApprovalPair[] operators);
}