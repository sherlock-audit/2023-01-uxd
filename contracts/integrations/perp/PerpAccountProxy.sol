// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.17;

import { IAccountBalance, AccountMarket } from "../../external/perp/IAccountBalance.sol";
import { IClearingHouse } from "../../external/perp/IClearingHouse.sol";
import { IVault } from "../../external/perp/IVault.sol";

/// @title PerpAccountProxy
/// @notice Proxy to fetch account info from futures DEX.
/// @dev Provides access to view calls in Perpetural Protocol 
/// ClearingHouse and AccountBalance contracts.
contract PerpAccountProxy {

    IAccountBalance public perpAccount;
    IClearingHouse public perpClearingHouse;

    constructor(address _accountContract, address _clearingHouse) {
        perpAccount = IAccountBalance(_accountContract);
        perpClearingHouse = IClearingHouse(_clearingHouse);
    }

    function getAccountInfo(address account, address baseToken) external view returns (AccountMarket.Info memory) {
        return perpAccount.getAccountInfo(account, baseToken);
    }

    function getTotalOpenNotional(address account, address baseToken) external view returns (int256) {
        return perpAccount.getTotalOpenNotional(account, baseToken);
    }

    function getTotalDebtValue(address account) external view returns (uint256) {
        return perpAccount.getTotalDebtValue(account);
    }

    function getPnlAndPendingFee(address account) external view returns (int256, int256, uint256) {
        return perpAccount.getPnlAndPendingFee(account);
    }

    function getTotalPositionSize(address account, address baseToken) external view returns (int256) {
        return perpAccount.getTotalPositionSize(account, baseToken);
    }

    function getTotalPositionValue(address account, address baseToken) external view returns (int256) {
        return perpAccount.getTotalPositionValue(account, baseToken);
    }

    function getTotalAbsPositionValue(address account) external view returns (uint256) {
        return perpAccount.getTotalAbsPositionValue(account);
    }

    function getFreeCollateral(address account) external view returns (uint256) {
        IVault vault = IVault(perpAccount.getVault());
        return vault.getFreeCollateral(account);
    }

    function getFreeCollateralByToken(address account, address token) external view returns (uint256) {
        IVault vault = IVault(perpAccount.getVault());
        return vault.getFreeCollateralByToken(account, token);
    }

    function getBalanceByToken(address account, address token) external view returns (int256) {
        IVault vault = IVault(perpAccount.getVault());
        return vault.getBalanceByToken(account, token);
    }
}
