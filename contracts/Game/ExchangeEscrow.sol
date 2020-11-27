// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155Holder.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";

contract ExchangeEscrow is Ownable, ERC1155Holder {
    using EnumerableSet for EnumerableSet.AddressSet;
    using Address for *;
    using ERC165Checker for *;

    /******** Constants ********/
    bytes4 private constant _INTERFACE_ID_TOKENBASE = 0xdd0390b5;
    
    /******** Stored Variables ********/
    EnumerableSet.AddressSet tokenAddrs;

    function addToken(address _tokenAddress) external onlyOwner {
        require(Address.isContract(_tokenAddress), "Address not valid");
        require(
            ERC165Checker.supportsInterface(_tokenAddress, _INTERFACE_ID_TOKENBASE),
            "Caller does not support Interface."
        );
        tokenAddrs.add(_tokenAddress);
    }

    function isTokenRegistered(address _tokenAddress) external view onlyOwner returns(bool) {
        return tokenAddrs.contains(_tokenAddress);
    }
}