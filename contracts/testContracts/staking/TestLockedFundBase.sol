// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../../staking/LockedFundBase.sol";

contract TestLockedFundBase is LockedFundBase {
    
    /******************** Public API ********************/
    function __TestLockedFundBase_init(address _token, address _rewardsPool) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        __ERC165_init_unchained();
        __LockedFundBase_init_unchained(_token, _rewardsPool);
    }
}