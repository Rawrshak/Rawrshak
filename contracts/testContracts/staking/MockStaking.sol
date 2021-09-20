// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "../../resolver/IAddressResolver.sol";
import "../../staking/interfaces/IExchangeFeesEscrow.sol";
import "../../staking/interfaces/IStaking.sol";
import "../../utils/LibContractHash.sol";

contract MockStaking is ContextUpgradeable {

    /***************** Stored Variables *****************/
    uint256 public totalStakedTokens;
    mapping(address => uint256) public userStakedAmount;
    IAddressResolver resolver;
    
    /******************** Public API ********************/
    constructor(address _resolver) {
        totalStakedTokens = 0;
        resolver = IAddressResolver(_resolver);
    }
    
    // No need to do checks because this is just for tests
    function stake(uint256 _amount) external {
        if (totalStakedTokens > 0) {
            totalStakedTokens += _amount;
        } else {
            totalStakedTokens = _amount;
            IExchangeFeesEscrow(resolver.getAddress(LibContractHash.CONTRACT_EXCHANGE_FEE_POOL)).initializeTokenRate();
        }
        
        IExchangeFeesEscrow(resolver.getAddress(LibContractHash.CONTRACT_EXCHANGE_FEE_POOL)).updateUserRewards(_msgSender());

        userStakedAmount[_msgSender()] += _amount;
    }

    function withdraw(uint256 _amount) public {     
        IExchangeFeesEscrow(resolver.getAddress(LibContractHash.CONTRACT_EXCHANGE_FEE_POOL)).updateUserRewards(_msgSender());

        userStakedAmount[_msgSender()] -= _amount;
        totalStakedTokens -= _amount;
    }
}