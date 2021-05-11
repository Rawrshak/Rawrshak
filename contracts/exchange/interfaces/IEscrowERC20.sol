// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../../libraries/LibOrder.sol";

interface IEscrowERC20 {

    /******** View Functions ********/
    function token() external view returns(address);
    
    function escrowedTokensByOrder(uint256 _orderId) external view returns(uint256);
    
    function claimableTokensByOwner(address _owner) external view returns(uint256); 

    /******** Mutative Functions ********/
    function deposit(uint256 _orderId, address _sender, uint256 _amount) external;

    function withdraw(uint256 _orderId, address _user, uint256 _amount) external;
    
    function depositRoyalty(address _sender, address _owner, uint256 _amount) external;

    function transferRoyalty(uint256 _orderId, address _to, uint256 _amount) external;
    
    function depositPlatformRoyalty(address _sender, address _feePool, uint256 _amount) external;

    function transferPlatformRoyalty(uint256 _orderId, address _feePool, uint256 _amount) external;

    function claim(address _owner) external;

}