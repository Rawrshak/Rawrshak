// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

interface IExchange {
    
    function placeBid(address _user, address _token, uint256 _uuid, uint256 _amount, uint256 _price)
        external;

    function placeAsk(address _user, address _token, uint256 _uuid, uint256 _amount, uint256 _price)
        external;

    function deleteDataEntry(uint256 _dataId) external;

    function getUserOrders(address _user)
        external
        view
        returns(uint256[] memory orders);

    function getItemData(uint256 _uuid)
        external
        view
        returns(uint256[] memory bidIds, uint256[] memory askIds);

    function getDataEntry(uint256 _dataId)
        external
        view
        returns(address _user, address _token, uint256 _uuid, uint256 _amount, uint256 _price, bool isBid);

    function claim(uint256 _dataId) external;

    function fullfillOrder(uint256 _dataId) external;
}