// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IExchangeFeesEscrow { 

    /******** View Functions ********/
    function rate() external view returns(uint24);
    
    function totalFeePool(address _token) external view returns(uint256);

    function distributionRates() external view returns(address[] memory _pools, uint24[] memory _percentages);
    
    /******** Mutative Functions ********/
    function setRate(uint24 _rate) external;
    
    function updateDistributionPools(address[] memory _pools, uint24[] memory _percentages) external;

    function depositRoyalty(address _token, uint256 _amount) external;

    function distribute() external;
    
    /*********************** Events *********************/
    event FeeUpdated(address indexed operator, uint24 rate);
    event PoolsUpdated(address indexed operator, address[] funds, uint24[] percentages);
    event PoolsDistributed(address indexed operator, address[] funds);
    event ExchangeFeesPaid(address indexed tokenAddr, uint256 amount);
}
