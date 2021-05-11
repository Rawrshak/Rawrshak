// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

interface IExchangeFeePool { 

    /******** View Functions ********/
    function bps() external view returns(uint256);
    
    function totalFeePool(bytes4 _token) external view returns(uint256);

    function distributionRates() external view returns(address[] memory _funds, uint256[] memory _percentages);
    
    /******** Mutative Functions ********/
    function setBps(uint256 _bps) external;
    
    function updateFunds(address[] memory _funds, uint256[] memory _percentages) external;

    function depositRoyalty(bytes4 _token, address _tokenAddr, uint256 _amount) external;

    function distribute(bytes4 _token, address _tokenAddr) external;
    
    /*********************** Events *********************/
    event FundsUpdated(address[] _funds, uint256[] _percentages);
    event FundsDistributed(address[] _funds, uint256[] _distributions);
    event ExchangeFeesPaid(bytes4 _token, address _tokenAddr, uint256 _amount);
}
