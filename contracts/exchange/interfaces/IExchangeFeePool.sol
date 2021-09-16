// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IExchangeFeePool { 

    /******** View Functions ********/
    function rate() external view returns(uint24);
    
    function totalFeePool(address _token) external view returns(uint256);

    function distributionRates() external view returns(address[] memory _funds, uint24[] memory _percentages);
    
    /******** Mutative Functions ********/
    function setRate(uint24 _rate) external;
    
    function updateDistributionFunds(address[] memory _funds, uint24[] memory _percentages) external;

    function depositRoyalty(address _token, uint256 _amount) external;

    function distribute(address _token) external;
    
    /*********************** Events *********************/
    event FeeUpdated(address indexed operator, uint24 rate);
    event FundsUpdated(address indexed operator, address[] funds, uint24[] percentages);
    event FundsDistributed(address indexed operator, address[] funds, uint256[] distributions);
    event ExchangeFeesPaid(address indexed tokenAddr, uint256 amount);
}
