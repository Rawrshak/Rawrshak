// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IExchangeFeePool { 

    /******** View Functions ********/
    function rate() external view returns(uint256);
    
    function totalFeePool(bytes4 _token) external view returns(uint256);

    function distributionRates() external view returns(address[] memory _funds, uint256[] memory _percentages);
    
    /******** Mutative Functions ********/
    function setRate(uint256 _rate) external;
    
    function updateDistributionFunds(address[] memory _funds, uint256[] memory _percentages) external;

    function depositRoyalty(bytes4 _token, address _tokenAddr, uint256 _amount) external;

    function distribute(bytes4 _token, address _tokenAddr) external;
    
    /*********************** Events *********************/
    event FeeUpdated(address indexed operator, uint256 rate);
    event FundsUpdated(address indexed operator, address[] funds, uint256[] percentages);
    event FundsDistributed(address indexed operator, address[] funds, uint256[] distributions);
    event ExchangeFeesPaid(bytes4 indexed token, address tokenAddr, uint256 amount);
}
