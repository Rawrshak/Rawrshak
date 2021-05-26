// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "./StorageBase.sol";
import "../utils/ExtendedEnumerableMaps.sol";
import "./interfaces/IExchangeFeePool.sol";

contract ExchangeFeePool is IExchangeFeePool, StorageBase {
    using AddressUpgradeable for address;
    using ERC165CheckerUpgradeable for address;
    using EnumerableSetUpgradeable for *;
    using SafeMathUpgradeable for uint256;

    /***************** Stored Variables *****************/
    mapping(bytes4 => uint256) amounts;
    uint256 public override rate;
    address[] funds;
    uint256[] percentages;

    /******************** Public API ********************/
    function __ExchangeFeePool_init(uint256 _rate) public initializer {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __AccessControl_init_unchained();
        __StorageBase_init_unchained();
        _registerInterface(LibConstants._INTERFACE_ID_EXCHANGE_FEE_POOL);
        rate = _rate;
    }
 
    function setRate(uint256 _rate) public override checkPermissions(MANAGER_ROLE) {
        require(_rate > 0 && _rate < 1 ether, "Invalid rate");
        rate = _rate;
        emit FeeUpdated(_msgSender(), rate);
    }

    // gets the amount in the fee pool
    function totalFeePool(bytes4 _token) external view override returns(uint256) {
        return amounts[_token];
    }

    function updateDistributionFunds(address[] memory _funds, uint256[] memory _percentages) external override checkPermissions(MANAGER_ROLE) {
        require(_funds.length > 0 && _funds.length == _percentages.length, "Invalid input length");

        delete funds;
        delete percentages;

        uint256 totalPercentages = 0;
        for (uint256 i = 0; i < _funds.length; ++i) {
            funds.push(_funds[i]);
            percentages.push(_percentages[i]);
            totalPercentages = totalPercentages.add(_percentages[i]);
        }
        require(totalPercentages == 1 ether, "Percentages do not sum to 1 ether.");

        emit FundsUpdated(_msgSender(), _funds, _percentages);
    }

    function distributionRates() external view override returns(address[] memory _funds, uint256[] memory _percentages) {
        _funds = funds;
        _percentages = percentages;
    }

    function depositRoyalty(bytes4 _token, address _tokenAddr, uint256 _amount) external override checkPermissions(MANAGER_ROLE) {
        amounts[_token] = amounts[_token].add(_amount);

        emit ExchangeFeesPaid(_token, _tokenAddr, _amount);
    }

    function distribute(bytes4 _token, address _tokenAddr) external override checkPermissions(MANAGER_ROLE) {
        require(funds.length > 0, "Invalid list of address for distribution");
        
        uint256 balance = IERC20Upgradeable(_tokenAddr).balanceOf(address(this));
        require(balance >= amounts[_token] && balance > 0, "Balance is incorrect.");
        amounts[_token] = 0;

        uint256[] memory distributions = new uint256[](funds.length);
        for (uint256 i = 0; i < funds.length; ++i) {
            distributions[i] = balance.mul(percentages[i]).div(1 ether);
            IERC20Upgradeable(_tokenAddr).transfer(funds[i], distributions[i]);
        }

        emit FundsDistributed(_msgSender(), funds, distributions);
    }

    uint256[50] private __gap;
}