// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155Holder.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";

contract ExchangeEscrow is Ownable, ERC1155Holder {
    using EnumerableSet for EnumerableSet.AddressSet;
    using Address for *;
    using ERC165Checker for *;

    /******** Constants ********/
    bytes4 private constant _INTERFACE_ID_TOKENBASE = 0xdd0390b5;
    bytes4 private constant _INTERFACE_ID_IGAME = 0x0a306cc6;
    
    /******** Stored Variables ********/
    EnumerableSet.AddressSet tokenAddrs;
    EnumerableSet.AddressSet gameAddrs;

    function addToken(address _tokenAddress) external onlyOwner {
        require(Address.isContract(_tokenAddress), "Address not valid");
        require(
            ERC165Checker.supportsInterface(_tokenAddress, _INTERFACE_ID_TOKENBASE),
            "Caller does not support Interface."
        );
        tokenAddrs.add(_tokenAddress);
    }

    function addGame(address _gameAddress) external onlyOwner {
        require(Address.isContract(_gameAddress), "Address not valid");
        require(
            ERC165Checker.supportsInterface(_gameAddress, _INTERFACE_ID_IGAME),
            "Caller does not support Interface."
        );
        
        if (gameAddrs.add(_gameAddress)) {
            IERC1155(_gameAddress).setApprovalForAll(owner(), true);
        }
    }

    function approveToken(address _tokenAddr, uint256 _amount) external onlyOwner returns(bool) {
        if (_isTokenRegistered(_tokenAddr)) {
            IERC20(_tokenAddr).approve(owner(), _amount);
            return true;
        }
        return false;
    }

    function approveGame(address _gameAddr, bool approved) external onlyOwner returns(bool) {
        if (_isGameRegistered(_gameAddr)) {
            IERC1155(_gameAddr).setApprovalForAll(owner(), approved);
            return true;
        }
        return false;
    }

    // Internal functions
    function _isTokenRegistered(address _tokenAddress) internal view onlyOwner returns(bool) {
        return tokenAddrs.contains(_tokenAddress);
    }

    function _isGameRegistered(address _gameAddress) internal view onlyOwner returns(bool) {
        return gameAddrs.contains(_gameAddress);
    }
}