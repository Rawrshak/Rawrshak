// SPDX-License-Identifier: MIT

pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "../interfaces/IBurnFees.sol";
import "./../../Content.sol";

/**
 * @dev Content Contract with Burn Fees
 * Todo: Create Tests for ContentWithBurnFees
 */
contract ContentWithBurnFees is IBurnFees, Content {
    using SafeMathUpgradeable for uint256;

    /***************** Stored Variables *****************/
    address public rawrToken;

    function __ContentWithBurnFees_init(
        string memory _name,
        string memory _symbol,
        IContentStorage _dataStorage,
        IAccessControlManager _accessControlManager,
        address _rawrToken)
        public initializer
    {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __ERC1155_init_unchained("");
        __Content_init_unchained(_name, _symbol, _dataStorage, _accessControlManager);
        __ContentWithBurnFees_init_unchained(_rawrToken);
    }

    function __ContentWithBurnFees_init_unchained(address _rawrToken) internal initializer {
        _registerInterface(LibConstants._INTERFACE_ID_CONTENT_WITH_BURN_FEES);
        rawrToken = _rawrToken;
    }

    function getBurnFee(uint256 _tokenId) external view override returns(LibAsset.Fee[] memory fees) {
        return dataStorage.getBurnFee(_tokenId);
    }

    // Override burnBatch() to account for non-registered contract & user burn fees. Anyone can create Craft, Salvage,
    // and lootbox contracts that can burn assets. This lowers the possible number of secondary fees a developer may
    // get. To combat this, developers can set a burn fee for non-registered burns from other contracts or users. A 
    // developer will have to register their own craft and lootbox contracts in order to bypass this burn fee.
    function burnBatch(LibAsset.BurnData memory _data) external override {
        require(_data.account == _msgSender() || isApprovedForAll(_data.account, _msgSender()), "Caller is not approved.");

        bool isSenderElevated = accessControlManager.isElevatedCaller(_msgSender());
        for (uint256 i = 0; i < _data.tokenIds.length; ++i) {
            require(_tokenExists(_data.tokenIds[i]), "token id missing");

            // If the caller does not have the correct access, request a burn fee to the developer.
            // Note: the user must call allowance() with this contract as the spender
            if (!isSenderElevated) {
                LibAsset.Fee[] memory fees = dataStorage.getBurnFee(_data.tokenIds[i]);

                // transfer fee from user to payable address. If transferFrom fails, the entire burn fails.
                for (uint256 j = 0; j < fees.length; ++j) {
                    IERC20Upgradeable(rawrToken).transferFrom(_data.account, fees[j].account, fees[j].amount);
                }
            }

            _updateSupply(_data.tokenIds[i], _supply(_data.tokenIds[i]).sub(_data.amounts[i], "amount is greater than supply"));
        }

        _burnBatch(_data.account, _data.tokenIds, _data.amounts);
        emit Burn(_msgSender(), _data);
    }

    function isElevatedCaller(address _caller) external view override returns (bool) {
        return accessControlManager.isElevatedCaller(_caller);
    }

    uint256[50] private __gap;
}
