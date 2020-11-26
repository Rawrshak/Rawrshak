// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

interface IExchange {
    
    function placeBid(address _user, address _token, uint256 _uuid, uint256 _amount, uint256 _price)
        external;

    function placeAsk(address _user, address _token, uint256 _uuid, uint256 _amount, uint256 _price)
        external;

    function getUserData(address _user)
        external
        view
        returns(uint256[] memory bidIds, uint256[] memory askIds);

    function getItemData(address _user)
        external
        view
        returns(uint256[] memory bidIds, uint256[] memory askIds);

    function getData(uint256 _dataId)
        external
        view
        returns(address _user, address _token, uint256 _uuid, uint256 _amount, uint256 _price);

    function fullfillOrder(uint256 _dataId) external;
}