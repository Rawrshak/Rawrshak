// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "./EscrowBase.sol";
import "./interfaces/IExchangeFeesEscrow.sol";
import "../utils/EnumerableMapsExtension.sol";

contract ExchangeFeesEscrow is IExchangeFeesEscrow, EscrowBase {
    using EnumerableMapsExtension for *;

    /***************** Stored Variables *****************/
    EnumerableMapsExtension.AddressToUintMap amounts;
    uint24 public override rate;
    address[] pools;
    uint24[] percentages;

    /******************** Public API ********************/
    function __ExchangeFeesEscrow_init(uint24 _rate) public initializer {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __AccessControl_init_unchained();
        __EscrowBase_init_unchained();
        __ExchangeFeesEscrow_init_unchained(_rate);
    }

    function __ExchangeFeesEscrow_init_unchained(uint24 _rate) internal initializer {
        _registerInterface(LibInterfaces.INTERFACE_ID_EXCHANGE_FEE_POOL);
        rate = _rate;
    }
 
    function setRate(uint24 _rate) public override onlyRole(MANAGER_ROLE) {
        require(_rate > 0 && _rate <= 1e6, "Invalid rate");
        rate = _rate;
        emit FeeUpdated(_msgSender(), rate);
    }

    function updateDistributionPools(address[] memory _pools, uint24[] memory _percentages) external override onlyRole(MANAGER_ROLE) {
        require(_pools.length > 0 && _pools.length == _percentages.length, "Invalid input length");

        delete pools;
        delete percentages;

        uint24 totalPercentages = 0;
        for (uint24 i = 0; i < _pools.length; ++i) {
            pools.push(_pools[i]);
            percentages.push(_percentages[i]);
            totalPercentages = totalPercentages + _percentages[i];
        }
        require(totalPercentages == 1e6, "Percentages do not sum to 100%");

        emit PoolsUpdated(_msgSender(), _pools, _percentages);
    }

    function depositRoyalty(address _token, uint256 _amount) external override onlyRole(MANAGER_ROLE) {
        amounts.set(_token, amounts.get(_token) + _amount);

        emit ExchangeFeesPaid(_token, _amount);
    }

    function distribute() external override onlyRole(MANAGER_ROLE) {
        require(pools.length > 0, "Invalid list of address for distribution");
        
        address token;
        uint256 balance;

        for (uint256 i = 0; i < amounts.length(); i++) {
            (token, balance) = amounts.at(i);
            uint256 tokenBalance = IERC20Upgradeable(token).balanceOf(address(this));

            // The reason we're not checking for exact equal is because anyone can send tokens 
            // to this contract. The balance has to be at least the amount on here.
            require(tokenBalance >= balance && tokenBalance > 0, "Balance is incorrect.");
            amounts.set(token, 0);

            // Distribute the entire balance to everyone (not just what was recorded)
            uint256[] memory distributions = new uint256[](pools.length);
            for (uint256 j = 0; j < pools.length; ++j) {
                distributions[j] = (tokenBalance * percentages[j]) / 1e6;
                IERC20Upgradeable(token).transfer(pools[j], distributions[j]);
            }
        }

        emit PoolsDistributed(_msgSender(), pools);
    }

    function distributionRates() external view override returns(address[] memory _pools, uint24[] memory _percentages) {
        _pools = pools;
        _percentages = percentages;
    }

    // gets the amount in the fee pool
    function totalFeePool(address _token) external view override returns(uint256) {
        return amounts.get(_token);
    }

    uint256[50] private __gap;
}