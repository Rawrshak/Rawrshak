// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

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
    event FeeUpdated(uint256 _rate);
    event FundsUpdated(address[] _funds, uint256[] _percentages);
    event FundsDistributed(address[] _funds, uint256[] _distributions);
    event ExchangeFeesPaid(bytes4 _token, address _tokenAddr, uint256 _amount);
}
