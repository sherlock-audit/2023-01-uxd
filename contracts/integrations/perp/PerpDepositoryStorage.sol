// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.17;

import {IVault} from "../../external/perp/IVault.sol";
import {IClearingHouse} from "../../external/perp/IClearingHouse.sol";
import {IMarketRegistry} from "../../external/perp/IMarketRegistry.sol";
import {IAccountBalance} from "../../external/perp/IAccountBalance.sol";
import {ISwapper} from "../ISwapper.sol";
import {IDepository} from "../IDepository.sol";

abstract contract PerpDepositoryStorage is IDepository {
    ///////////////////////////////////////////////////////////////////
    ///                     Configuration
    ///////////////////////////////////////////////////////////////////

    /// @notice PERP Vault contract
    IVault public vault;

    /// @notice PERP ClearingHouse contract
    IClearingHouse public clearingHouse;

    /// @notice PERP MarketRegistry contract
    IMarketRegistry public marketRegistry;
    
    /// @notice Sport market swapping contract.
    ISwapper public spotSwapper;

    /// @notice Quote token address
    address public quoteToken;

    /// @notice Collateral token address
    address public assetToken;

    /// @notice PERP market to open delta-neutral position in.
    address public market;

    /// @notice The UXDController address
    /// @dev This is the only address allowed to call functions related to minting and redeeming.
    address public controller;

    ///////////////////////////////////////////////////////////////////
    ///                     Accounting state
    ///////////////////////////////////////////////////////////////////

    /// @notice The total amount of asset token collateral deposited -  amount redeemed.
    uint256 public netAssetDeposits;

    /// @notice The total amount of insurance token deposited - insurance withdrawn.
    uint256 public insuranceDeposited;

    /// @notice The total quote position opened.
    uint256 public redeemableUnderManagement;

    /// @notice The total fees paid in opening and closing positions
    /// @dev fees are calculated using the exchangeFee which returns the PERP fee
    uint256 public totalFeesPaid;

    /// @notice The redeemable soft cap.
    uint256 public redeemableSoftCap;

    /// @notice The minted - redeemed with quote token
    /// @dev Positive when minted more than redeemed. Negative when redeemed more than minted
    int256 public quoteMinted;
}
