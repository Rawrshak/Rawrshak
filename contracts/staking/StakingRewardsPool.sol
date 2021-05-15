// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "./FundBase.sol";

contract StakingRewardsPool is FundBase {
    
    /******************** Public API ********************/
    function __StakingRewardsPool_init(address _token) public initializer {
        __Context_init_unchained();
        __AccessControl_init_unchained();
        __ERC165_init_unchained();
        __FundBase_init_unchained(_token);
    }
}