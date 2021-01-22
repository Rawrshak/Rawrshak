// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

interface IExchange {
    /******** View Functions ********/ 
    function getOrder(uint256 _orderId)
        external
        view
        returns(address user, address token, uint256 uuid, uint256 amount, uint256 price, bool isBid);
    
    /******** Mutative Functions ********/ 
    function setGlobalItemRegistryAddr(address _addr) external;

    function placeBid(address _user, address _token, uint256 _uuid, uint256 _amount, uint256 _price)
        external;

    function placeAsk(address _user, address _token, uint256 _uuid, uint256 _amount, uint256 _price)
        external;

    function deleteOrder(uint256 _orderId) external;

    function claim(uint256 _orderId) external;

    function claimAll() external;

    function fullfillOrder(uint256 _orderId, uint256 _amount) external;
}