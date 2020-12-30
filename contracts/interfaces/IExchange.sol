// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

interface IExchange {
    /******** View Functions ********/ 
    function getOrder(uint256 _dataId)
        external
        view
        returns(address _user, address _token, uint256 _uuid, uint256 _amount, uint256 _price, bool isBid, bool isAvailable);
    
    /******** Mutative Functions ********/ 
    function setGlobalItemRegistryAddr(address _addr) external;

    function placeBid(address _user, address _token, uint256 _uuid, uint256 _amount, uint256 _price)
        external;

    function placeAsk(address _user, address _token, uint256 _uuid, uint256 _amount, uint256 _price)
        external;

    function deleteOrder(uint256 _dataId) external;

    function claim(uint256 _dataId) external;

    function claimAll() external;

    function fullfillOrder(uint256 _dataId) external;
}