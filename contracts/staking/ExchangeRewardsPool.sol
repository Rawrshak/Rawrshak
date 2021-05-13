// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "../tokens/RawrToken.sol";

contract ExchangeRewardsPool is OwnableUpgradeable, ERC165StorageUpgradeable {
    using AddressUpgradeable for address;
    using SafeMathUpgradeable for uint256;

    address public rawrToken;
    uint256 public supply;
    uint256 public remaining;

    event FundsReceived(uint256 amount, uint256 rewardPoolSupply);
    event Claimed(uint256 amount, uint256 remaining);

    function __ExchangeRewardsPool_init(address _token) public initializer {
        require(_token.isContract() && 
            ERC165CheckerUpgradeable.supportsInterface(_token, LibConstants._INTERFACE_ID_TOKENBASE),
            "Invalid erc 20 contract interface.");
        rawrToken = _token;
        supply = 0;
        remaining = 0;
    }
    
    function receiveFunds(uint256 _amount) external onlyOwner {
        require(_amount > 0, "Invalid amount");

        supply = remaining.add(_amount);
        remaining = supply;

        emit FundsReceived(_amount, supply);
    }

    function claim(uint256 _amount) external onlyOwner {
        require(_amount > 0, "Invalid claim");
        remaining = remaining.sub(_amount);

        emit Claimed(_amount, remaining);
    }
}