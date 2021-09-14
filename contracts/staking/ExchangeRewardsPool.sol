// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./FundBase.sol";

contract ExchangeRewardsPool is FundBase {

    /******************** Public API ********************/
    function __ExchangeRewardsPool_init(address _token) public initializer {
        __Context_init_unchained();
        __AccessControl_init_unchained();
        __ERC165_init_unchained();
        __FundBase_init_unchained(_token);
    }
}