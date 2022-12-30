// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.17;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {IDepository, DepositoryState} from "../IDepository.sol";
import {IVault} from "../../external/perp/IVault.sol";
import {IClearingHouse} from "../../external/perp/IClearingHouse.sol";
import {IMarketRegistry} from "../../external/perp/IMarketRegistry.sol";
import {IAccountBalance} from "../../external/perp/IAccountBalance.sol";
import {IExchange} from "../../external/perp/IExchange.sol";
import {IUXDRouter} from "../../core/IUXDRouter.sol";
import {ERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ErrZeroAddress} from "../../common/Constants.sol";
import {FixedPointMathLib} from "../../libraries/FixedPointMath.sol";
import {MathLib} from "../../libraries/MathLib.sol";
import {ISwapper, SwapParams} from "../ISwapper.sol";
import {PerpDepositoryStorage} from "./PerpDepositoryStorage.sol";

/// @title PerpDepository
/// @notice Handles interactions with Perpetual Protocol Curie smart congtracts.
/// @dev Collateral deposits, withdrawals and open positions are managed by this contract.
contract PerpDepository is
    UUPSUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    PerpDepositoryStorage
{
    using FixedPointMathLib for uint256;
    using MathLib for uint256;
    using MathLib for uint160;
    using AddressUpgradeable for address;

    ///////////////////////////////////////////////////////////////////
    ///                         Errors
    ///////////////////////////////////////////////////////////////////
    error NotController(address caller);
    error NotApproved(uint256 allowance, uint256 amount);
    error ZeroAmount();
    error RedeemableSoftCapHit(uint256 softcap, uint256 newBasePosition);
    error InsufficientPnl(int256 allowance, uint256 amount);
    error InvalidRebalance(int8 polarity);
    error InvalidQuoteTokenBalance(int256 balance);
    error AddressNotContract(address addr);
    error PositivePnlRebalanceDisabled(address caller);
    error QuoteRedeemDisabled(address account);
    error UnsupportedAsset(address asset);
    error InsufficientAssetDeposits(uint256 assetDeposits, uint256 amount);

    ///////////////////////////////////////////////////////////////////
    ///                         Events
    ///////////////////////////////////////////////////////////////////
    event InsuranceDeposited(
        address indexed caller,
        address indexed from,
        uint256 amount
    );
    event InsuranceWithdrawn(
        address indexed caller,
        address indexed to,
        uint256 amount
    );
    event RedeemableSoftCapUpdated(address indexed caller, uint256 newSoftCap);
    event PositionOpened(
        bool isShort,
        uint256 amount,
        bool amountIsInput,
        uint160 sqrtPriceLimitX96
    );

    event Rebalanced(uint256 baseAmount, uint256 quoteAmount, int256 shortfall);

    ///////////////////////////////////////////////////////////////////
    ///                     Constants
    ///////////////////////////////////////////////////////////////////

    /// @dev For Perpetual protocol fee calculations
    uint256 public constant HUNDRED_PERCENT = 1e6;

    uint256 private constant WAD = 1e18;

    modifier onlyController() {
        if (msg.sender != address(controller)) {
            revert NotController(msg.sender);
        }
        _;
    }

    /// @notice Initializer
    /// @param _clearingHouse Perp curie clearing house
    /// @param _marketRegistry Perp curie market registry
    /// @param _futuresMarket The market this depository opens positions in
    /// @param _assetToken The asset/collateral token address
    /// @param _quoteToken The insurance token address
    /// @param _controller UXD Controller. Used for access control
    function initialize(
        address _vault,
        address _clearingHouse,
        address _marketRegistry,
        address _futuresMarket,
        address _assetToken,
        address _quoteToken,
        address _controller
    ) external virtual initializer {
        __UUPSUpgradeable_init();
        __Ownable_init();
        __ReentrancyGuard_init();

        address[] memory contractAddresses = new address[](7);
        contractAddresses[0] = _vault;
        contractAddresses[1] = _clearingHouse;
        contractAddresses[2] = _marketRegistry;
        contractAddresses[3] = _futuresMarket;
        contractAddresses[4] = _assetToken;
        contractAddresses[5] = _quoteToken;
        contractAddresses[6] = _controller;
        _checkContractAddresses(contractAddresses);

        vault = IVault(_vault);
        clearingHouse = IClearingHouse(_clearingHouse);
        marketRegistry = IMarketRegistry(_marketRegistry);
        market = _futuresMarket;
        assetToken = _assetToken;
        quoteToken = _quoteToken;
        controller = _controller;
    }

    function _checkContractAddresses(address[] memory addresses) private view {
        for (uint256 i = 0; i < addresses.length; i++) {
            if (!addresses[i].isContract()) {
                revert AddressNotContract(addresses[i]);
            }
        }
    }

    //////////////////////////////////////////////////////////////////
    ///                 Admin functions
    //////////////////////////////////////////////////////////////////

    /// @notice Sets the controller address
    /// @param _controller The new controller address
    function setController(address _controller) external onlyOwner {
        if (!_controller.isContract()) {
            revert AddressNotContract(_controller);
        }
        controller = _controller;
    }

    /// @notice Sets the spot market swapping contract address.
    /// @dev This updates the contract that performs the spot market swap as part of rebalancing.
    /// @param _swapper The new contract address
    function setSpotSwapper(address _swapper) external onlyOwner {
        if (!_swapper.isContract()) {
            revert AddressNotContract(_swapper);
        }
        spotSwapper = ISwapper(_swapper);
    }

    /// @notice Sets the redeemable soft cap
    /// @dev Can only be called by owner
    /// @param softCap The new redeemable soft cap
    function setRedeemableSoftCap(uint256 softCap) external onlyOwner {
        if (softCap == 0) {
            revert ZeroAmount();
        }
        redeemableSoftCap = softCap;

        emit RedeemableSoftCapUpdated(msg.sender, softCap);
    }

    /// @notice Deposits insurance to this depository
    /// @dev Insurance token is set at contract initialization.
    /// Only called by the owner
    /// @param amount the amount to deposit
    /// @param from the account to deposit from. This account must have approved this contract to
    // spend >= amount.
    function depositInsurance(uint256 amount, address from)
        external
        nonReentrant
        onlyOwner
    {
        if (amount == 0) {
            revert ZeroAmount();
        }
        uint256 allowance = IERC20(insuranceToken()).allowance(
            from,
            address(this)
        );
        if (allowance < amount) {
            revert NotApproved(allowance, amount);
        }

        insuranceDeposited += amount;

        IERC20(insuranceToken()).transferFrom(from, address(this), amount);
        IERC20(insuranceToken()).approve(address(vault), amount);
        vault.deposit(insuranceToken(), amount);

        emit InsuranceDeposited(msg.sender, from, amount);
    }

    /// @notice Withdraws insurance from this depository
    /// @dev Can only be called by Owner (governance).
    /// @param amount The amount to withdraw.
    /// @param to The account to withdraw to.
    function withdrawInsurance(uint256 amount, address to)
        external
        nonReentrant
        onlyOwner
    {
        if (amount == 0) {
            revert ZeroAmount();
        }

        insuranceDeposited -= amount;

        vault.withdraw(insuranceToken(), amount);
        IERC20(insuranceToken()).transfer(to, amount);

        emit InsuranceWithdrawn(msg.sender, to, amount);
    }

    ///////////////////////////////////////////////////////////////////
    ///                 Mint and redeem
    ///////////////////////////////////////////////////////////////////

    /// @notice Deposit asset and return the amount of redeemable that can be minted.
    /// @dev This is set up to handle either `assetToken` or `quoteToken` deposits.
    /// If `assetToken` is deposted, we use the delta-neutral strategy and open additional
    /// short position. The amount returned is the `quote` amount from opening the short.
    /// If `quoteToken` is deposited, we use the "quote mint" strategy whereby we deposit
    /// quote token and return an equivalant amount redeemable.
    /// Quote minting is only possible if we have a negative PnL > `amount`. The amount deposited
    /// is used to pay off part of this negative PnL.
    /// @param asset The token to deposit
    /// @param amount The amount to deposit
    /// @return amountOut The amount of redeemable that can be added to the total supply.
    function deposit(
        address asset,
        uint256 amount
    ) external onlyController returns (uint256) {
        if (asset == assetToken) {
            _depositAsset(amount);
            (, uint256 quoteAmount) = _openShort(amount);
            return quoteAmount;
        } else if (asset == quoteToken) {
            return _processQuoteMint(amount);
        } else {
            revert UnsupportedAsset(asset);
        }
    }

    /// @notice Redeem an amount of redeemable token.
    /// @dev This handles redeeming for either `assetToken` or `quoteToken`.
    /// If `assetToken` is specified, we use the delta-neutral strategy and close part of the
    /// short position. This frees up asset collateral which can then be returned to the user.
    /// If `quoteToken` is specified, we use the quote redeem strategy where we withdraw quote token
    /// which can be returned to the caller. This is only possible if we have a positive PnL > amount being redeemed.
    /// @param asset The asset to receive from this redemption
    /// @param amount The amount of redeemable to redeem
    /// @return amountOut The amount of `asset` released from this redemption
    function redeem(
        address asset,
        uint256 amount
    ) external onlyController returns (uint256) {
        if (asset == assetToken) {
            (uint256 base, ) = _openLong(amount);
            _withdrawAsset(base, address(controller));
            return base;
        } else if (asset == quoteToken) {
            revert QuoteRedeemDisabled(msg.sender);
            // return _processQuoteRedeem(amount);
        } else {
            revert UnsupportedAsset(asset);
        }
    }

    /// @notice Deposits collateral to back the delta-neutral position
    /// @dev Only called by the controller
    /// @param amount The amount to deposit
    function _depositAsset(uint256 amount) private {
        netAssetDeposits += amount;

        IERC20(assetToken).approve(address(vault), amount);
        vault.deposit(assetToken, amount);
    }

    /// @notice Withdraws collateral to used in the delta-neutral position.
    /// @dev This should only happen when redeeming UXD for collateral.
    /// Only called by the controller.
    /// @param amount The amount to deposit
    function _withdrawAsset(uint256 amount, address to) private {
        if (amount > netAssetDeposits) {
            revert InsufficientAssetDeposits(netAssetDeposits, amount);
        }
        netAssetDeposits -= amount;

        vault.withdraw(address(assetToken), amount);
        IERC20(assetToken).transfer(to, amount);
    }

    /// @notice Opens a long position on the perpetual DEX.
    /// @dev This closes a portion of the previously open short backing the delta-neutral position.
    /// Only called by the controller
    /// @param amount The amount to open long position for.
    /// `isBaseToQuote == false`, `exactInput == true`, so this is the quote amount.
    function _openLong(uint256 amount)
        private
        returns (uint256, uint256)
    {
        (uint256 baseAmount, uint256 quoteAmount) = _placePerpOrder(
            amount,
            false, // isShort
            true, // isExactInput
            0 // sqrtPriceLimitX96
        );
        redeemableUnderManagement -= quoteAmount;

        return (baseAmount, quoteAmount);
    }

    /// @notice Opens a short position on the perpetual DEX.
    /// @dev This increases the size of the delta-neutral position.
    /// Can only be called by the controller
    /// @param amount The amount of short position to open. THis is opened with `exactInput = true`,
    /// thus, this is the input/base token amount.
    /// @return base, quote
    function _openShort(uint256 amount)
        private
        returns (uint256, uint256)
    {
        (uint256 baseAmount, uint256 quoteAmount) = _placePerpOrder(
            amount,
            true, // short
            true, // exactInput
            0
        );
        redeemableUnderManagement += quoteAmount;
        _checkSoftCap();
        // emit event here
        return (baseAmount, quoteAmount);
    }

    function _placePerpOrder(
        uint256 amount,
        bool isShort,
        bool amountIsInput,
        uint160 sqrtPriceLimit
    ) private returns (uint256, uint256) {
        uint256 upperBound = 0; // 0 = no limit, limit set by sqrtPriceLimit

        IClearingHouse.OpenPositionParams memory params = IClearingHouse
            .OpenPositionParams({
                baseToken: market,
                isBaseToQuote: isShort, // true for short
                isExactInput: amountIsInput, // we specify exact input amount
                amount: amount, // collateral amount - fees
                oppositeAmountBound: upperBound, // output upper bound
                // solhint-disable-next-line not-rely-on-time
                deadline: block.timestamp,
                sqrtPriceLimitX96: sqrtPriceLimit, // max slippage
                referralCode: 0x0
            });

        (uint256 baseAmount, uint256 quoteAmount) = clearingHouse.openPosition(
            params
        );
        uint256 feeAmount = _calculatePerpOrderFeeAmount(quoteAmount);
        totalFeesPaid += feeAmount;

        emit PositionOpened(isShort, amount, amountIsInput, sqrtPriceLimit);
        return (baseAmount, quoteAmount);
    }

    ///////////////////////////////////////////////////////////////////////////
    ///                     Quote mint and redeem
    ///////////////////////////////////////////////////////////////////////////
    /// @notice Process minting with quote token
    /// @dev Deposits quote token to offset open noitional. Only possible if unrealizedPnl() > quoteAmount (normalized to 10^18).
    /// Only called by controller.
    /// @param quoteAmount The amount of quote amount being deposited.
    /// @return normalizedAmount The amount of redeemable that can be minted.
    function _processQuoteMint(uint256 quoteAmount) private returns (uint256) {
        uint256 normalizedAmount = quoteAmount.fromDecimalToDecimal(
            ERC20(quoteToken).decimals(),
            18
        );
        _checkNegativePnl(normalizedAmount);
        quoteMinted += int256(normalizedAmount);
        redeemableUnderManagement += normalizedAmount;
        _checkSoftCap();
        IERC20(quoteToken).approve(address(vault), quoteAmount);
        vault.deposit(quoteToken, quoteAmount);
        return normalizedAmount;
    }


    /// NOTE: Quote redeem disabled (rebalances positive PnL)
    /// @notice Process redeeming quote token on this depository.
    /// @dev Withdraws quote token from the vault and returns it to the user.
    /// Only called by controller.
    //// @param redeemableAmount The amount being redeemed.
    /// @return quoteAmout The amount of quote token withdrawn.
    // function _processQuoteRedeem(uint256 redeemableAmount)
    //     private
    //     onlyController
    //     returns (uint256)
    // {
    //     _checkPositivePnl(redeemableAmount);
    //     quoteMinted -= int256(redeemableAmount);
    //     redeemableUnderManagement -= redeemableAmount;
    //     uint256 quoteAmount = redeemableAmount.fromDecimalToDecimal(
    //         18,
    //         ERC20(quoteToken).decimals()
    //     );
    //     vault.withdraw(quoteToken, quoteAmount);
    //     IERC20(quoteToken).transfer(address(controller), quoteAmount);
    //     return quoteAmount;
    // }

    /// @notice The unrealized Pnl from the delta neutral position.
    /// @dev A positive value means the `redeemableUnderManagement` is larger than the delta neutral position
    /// thus, we quote redeem or rebalance positive PnL.
    /// A negative value means the `redeemableUnderManagement` is smaller than the delta neutral position value
    /// thus, we can quote mint and/or rebalance negative PnL.
    /// @return pnl The differnce between the `redeemableUnderManagement` and current perp position size.
    function getUnrealizedPnl() public view returns (int256) {
        return int256(redeemableUnderManagement) - int256(getPositionValue());
    }

    ////////////////////////////////////////////////////////////////////////
    ///                        Rebalancing
    ////////////////////////////////////////////////////////////////////////

    /// @notice Rebalance PnL
    /// @param amount The amount in quote token to rebalance.
    /// @param amountOutMinimum The minimum amount of base token to receive in the swap to proceed with rebalancing.
    /// @param polarity the direction of the rebalance. -1 to rebalance negative PnL, +1 for positive PnL
    /// @param sqrtPriceLimitX96 The target price when performing the swap on the spot DEX, and also when placing the perp order.
    /// @param account If there is any shortfall in the swap `account` covers the difference.
    /// For negative PnL, account must have pre-approved this contract to spend quoteToken.
    /// For positive PnL, account must have pre-approved this contract to spend assetToken.
    /// The maximum amount that must be transferred from account = swap fees + slippage.
    function rebalance(
        uint256 amount,
        uint256 amountOutMinimum,
        uint160 sqrtPriceLimitX96,
        uint24 swapPoolFee,
        int8 polarity,
        address account
    ) external nonReentrant returns (uint256, uint256) {
        if (polarity == -1) {
            return
                _rebalanceNegativePnlWithSwap(
                    amount,
                    amountOutMinimum,
                    sqrtPriceLimitX96,
                    swapPoolFee,
                    account
                );
        } else if (polarity == 1) {
            // disable rebalancing positive PnL
            revert PositivePnlRebalanceDisabled(msg.sender);
            // return _rebalancePositivePnlWithSwap(amount, amountOutMinimum, sqrtPriceLimitX96, swapPoolFee, account);
        } else {
            revert InvalidRebalance(polarity);
        }
    }

    // Collateral price has increased, thus, positionValue > supply. close part of open position
    // close (amount quote) part of position => (baseAmount, quoteAmount)
    // withdraw baseAmount base token.
    // swap base => quote
    // Transfer shortfall from swap from `account`
    // deposit USDC to cover negative PnL
    function _rebalanceNegativePnlWithSwap(
        uint256 amount,
        uint256 amountOutMinimum,
        uint160 sqrtPriceLimitX96,
        uint24 swapPoolFee,
        address account
    ) private returns (uint256, uint256) {
        uint256 normalizedAmount = amount.fromDecimalToDecimal(
            ERC20(quoteToken).decimals(),
            18
        );
        _checkNegativePnl(normalizedAmount);
        bool isShort = false;
        bool amountIsInput = true;
        (uint256 baseAmount, uint256 quoteAmount) = _placePerpOrder(
            normalizedAmount,
            isShort,
            amountIsInput,
            sqrtPriceLimitX96
        );
        vault.withdraw(assetToken, baseAmount);
        SwapParams memory params = SwapParams({
            tokenIn: assetToken,
            tokenOut: quoteToken,
            amountIn: baseAmount,
            amountOutMinimum: amountOutMinimum,
            sqrtPriceLimitX96: sqrtPriceLimitX96,
            poolFee: swapPoolFee
        });
        uint256 quoteAmountOut = spotSwapper.swapExactInput(params);
        int256 shortFall = int256(
            quoteAmount.fromDecimalToDecimal(18, ERC20(quoteToken).decimals())
        ) - int256(quoteAmountOut);
        if (shortFall > 0) {
            IERC20(quoteToken).transferFrom(
                account,
                address(this),
                uint256(shortFall)
            );
        } else if (shortFall < 0) {
            // we got excess tokens in the spot swap. Send them to the account paying for rebalance
            IERC20(quoteToken).transfer(
                account,
                _abs(shortFall)
            );
        }
        vault.deposit(quoteToken, quoteAmount);

        emit Rebalanced(baseAmount, quoteAmount, shortFall);
        return (baseAmount, quoteAmount);
    }

    /// NOTE: Rebalancing positive PnL disabled.
    // Collateral price has fallen, thus, openNotional < supply. Open more DNP.
    // withdraw quote profit
    // swap quote => base
    // deposit base
    // open more DNP amount
    // function _rebalancePositivePnlWithSwap(
    //     uint256 amount,
    //     uint256 amountOutMinimum,
    //     uint160 sqrtPriceLimitX96,
    //     uint24 swapPoolFee,
    //     address account
    // ) private returns (uint256, uint256) {
    //     uint256 normalizedAmount = amount.fromDecimalToDecimal(
    //         ERC20(quoteToken).decimals(),
    //         18
    //     );
    //     _checkPositivePnl(normalizedAmount);
    //     vault.withdraw(quoteToken, amount);
    //     SwapParams memory params = SwapParams({
    //         tokenIn: quoteToken,
    //         tokenOut: assetToken,
    //         amountIn: normalizedAmount,
    //         amountOutMinimum: amountOutMinimum,
    //         sqrtPriceLimitX96: sqrtPriceLimitX96,
    //         poolFee: swapPoolFee
    //     });
    //     uint256 baseAmountFromSwap = spotSwapper.swapExactInput(params);
    //     // can we wait to deposit this after we know the shortfall?
    //     vault.deposit(assetToken, baseAmountFromSwap);
    //     (uint256 baseAmount, uint256 quoteAmount) = _placePerpOrder(
    //         normalizedAmount,
    //         true, // expand position
    //         false, // amount is input
    //         sqrtPriceLimitX96
    //     );
    //     int256 shortFall = int256(baseAmount) - int256(baseAmountFromSwap);
    //     if (shortFall > 0) {
    //         IERC20(assetToken).transferFrom(
    //             account,
    //             address(this),
    //             uint256(shortFall)
    //         );
    //         vault.deposit(assetToken, uint256(shortFall));
    //     } else if (shortFall < 0) {
    //         // we got excess tokens from swap. Send them to account paying for rebalance
    //         IERC20(assetToken).transfer(
    //             account,
    //             _abs(shortFall)
    //         );
    //     }

    //     emit Rebalanced(baseAmount, quoteAmount, shortFall);
    //     return (baseAmount, quoteAmount);
    // }

    /// @notice Rebalance unrealized PnL lite.
    /// @dev Lite rebalancing requires the caller to provide the amount to rebalance.
    /// For negative PnL, `account` provides amount in quote token.
    /// For this call to succeed the account must have approved this contract to spend amount (for negative PnL),
    /// or equivalent amount in assetToken (for positive PnL).
    /// @param amount The amount of PnL to rebalance in quote token decimals.
    /// @param polarity The direction of the rebalance. -1 for negative PnL, +1 for positive PnL.
    /// @param sqrtPriceLimitX96 The target price when placing the perp order to resize the delta neutral position.
    /// @param account The account doing the rebalancing. This account must provide the collateral
    /// or quote amount and receives the other side after the swap.
    /// @return (baseAmount, quoteAmount) the amount rebalanced in baseAmount and quoteAmount.
    function rebalanceLite(
        uint256 amount,
        int8 polarity,
        uint160 sqrtPriceLimitX96,
        address account
    ) external nonReentrant returns (uint256, uint256) {
        if (polarity == -1) {
            return
                _rebalanceNegativePnlLite(amount, sqrtPriceLimitX96, account);
        } else if (polarity == 1) {
            // disable rebalancing positive PnL
            revert PositivePnlRebalanceDisabled(msg.sender);
            // return _rebalancePositivePnlLite(amount, sqrtPriceLimitX96, account);
        } else {
            revert InvalidRebalance(polarity);
        }
    }

    function _rebalanceNegativePnlLite(
        uint256 amount,
        uint160 sqrtPriceLimitX96,
        address account
    ) private returns (uint256, uint256) {
        uint256 normalizedAmount = amount.fromDecimalToDecimal(
            ERC20(quoteToken).decimals(),
            18
        );

        _checkNegativePnl(normalizedAmount);
        IERC20(quoteToken).transferFrom(account, address(this), amount);
        IERC20(quoteToken).approve(address(vault), amount);
        vault.deposit(quoteToken, amount);

        bool isShort = false;
        bool amountIsInput = true;
        (uint256 baseAmount, uint256 quoteAmount) = _placePerpOrder(
            normalizedAmount,
            isShort,
            amountIsInput,
            sqrtPriceLimitX96
        );
        vault.withdraw(assetToken, baseAmount);
        IERC20(assetToken).transfer(account, baseAmount);

        emit Rebalanced(baseAmount, quoteAmount, 0);

        return (baseAmount, quoteAmount);
    }

    /// NOTE: Rebalance positive PnL disabled
    // function _rebalancePositivePnlLite(
    //     uint256 amount,
    //     uint160 sqrtPriceLimitX96,
    //     address account
    // ) private returns (uint256, uint256) {
    //     uint256 normalizedAmount = amount.fromDecimalToDecimal(
    //         ERC20(quoteToken).decimals(),
    //         18
    //     );
    //     _checkPositivePnl(normalizedAmount);
    //     bool isShort = true;
    //     bool amountIsInput = false;
    //     (uint256 baseAmount, uint256 quoteAmount) = _placePerpOrder(
    //         normalizedAmount,
    //         isShort,
    //         amountIsInput,
    //         sqrtPriceLimitX96
    //     );
    //     uint256 baseIncludingFee = baseAmount +
    //         baseAmount.mulWadUp(getExchangeFeeWad());
    //     IERC20(assetToken).transferFrom(
    //         account,
    //         address(this),
    //         baseIncludingFee
    //     );
    //     IERC20(assetToken).approve(address(vault), baseIncludingFee);
    //     vault.deposit(assetToken, baseIncludingFee);
    //     vault.withdraw(quoteToken, amount);
    //     IERC20(quoteToken).transfer(account, amount);

    //     emit Rebalanced(baseAmount, quoteAmount, 0);
    //     return (baseAmount, quoteAmount);
    // }

    /// @dev check if negative Pnl exists > amount
    function _checkNegativePnl(uint256 amount) private view {
        int256 pnl = getUnrealizedPnl();
        if (pnl >= 0 || _abs(pnl) < amount) {
            revert InsufficientPnl(pnl, amount);
        }
    }

    /// NOTE: Rebalance positive PnL disabled
    /// @dev check if positive Pnl exists > amount
    // function _checkPositivePnl(uint256 amount) private view {
    //     int256 pnl = getUnrealizedPnl();
    //     if (pnl <= 0 || uint256(pnl) < amount) {
    //         revert InsufficientPnl(pnl, amount);
    //     }
    // }

    ///////////////////////////////////////////////////////////////////////
    ///                       State view functions
    ///////////////////////////////////////////////////////////////////////

    function insuranceToken() public view returns (address) {
        return quoteToken;
    }

    /// @notice Returns the current size of the short position in quote amount.
    /// @return Position size
    function getPositionValue() public view returns (uint256) {
        uint256 markPrice = getMarkPriceTwap(15);
        int256 positionSize = IAccountBalance(clearingHouse.getAccountBalance())
            .getTakerPositionSize(address(this), market);
        return markPrice.mulWadUp(_abs(positionSize));
    }

    function getMarkPriceTwap(uint32 twapInterval)
        public
        view
        returns (uint256)
    {
        IExchange exchange = IExchange(clearingHouse.getExchange());
        uint256 markPrice = exchange
            .getSqrtMarkTwapX96(market, twapInterval)
            .formatSqrtPriceX96ToPriceX96()
            .formatX96ToX10_18();
        return markPrice;
    }

    /// @notice Gets the available free colalteral.
    /// @return amount the free colalteral available not locked in open positions.
    function getFreeCollateral() external view returns (uint256) {
        return vault.getFreeCollateral(address(this));
    }

    /// @notice Get the current accounting state of the depository.
    /// @return state `DepositoryState` instance representing the current state of this depository.
    function getCurrentState() external view returns (DepositoryState memory) {
        return
            DepositoryState({
                netAssetDeposits: netAssetDeposits,
                insuranceDeposited: insuranceDeposited,
                redeemableUnderManagement: redeemableUnderManagement,
                totalFeesPaid: totalFeesPaid,
                redeemableSoftCap: redeemableSoftCap
            });
    }

    /// @notice Returns the total value of this depository's an account with the DEX.
    /// @return value The total account value
    function getAccountValue() external view returns (int256) {
        return clearingHouse.getAccountValue(address(this));
    }

    /// @notice Get the quote token balance of this user
    /// @dev THe total debt is computed as:
    ///     quote token balance + unrealized PnL - Pending fee - pending funding payments
    /// @param account The account to return the debt for
    /// @return debt The account debt, or zero if no debt.
    function getDebtValue(address account) external view returns (uint256) {
        IAccountBalance perpAccountBalance = IAccountBalance(
            clearingHouse.getAccountBalance()
        );
        IExchange perpExchange = IExchange(clearingHouse.getExchange());
        int256 accountQuoteTokenBalance = vault.getBalance(account);
        if (accountQuoteTokenBalance < 0) {
            revert InvalidQuoteTokenBalance(accountQuoteTokenBalance);
        }
        int256 fundingPayment = perpExchange.getAllPendingFundingPayment(
            account
        );
        uint256 quoteTokenBalance = uint256(accountQuoteTokenBalance)
            .fromDecimalToDecimal(ERC20(quoteToken).decimals(), 18);
        (
            ,
            int256 perpUnrealizedPnl,
            uint256 perpPendingFee
        ) = perpAccountBalance.getPnlAndPendingFee(account);
        int256 debt = int256(quoteTokenBalance) +
            perpUnrealizedPnl -
            int256(perpPendingFee) -
            fundingPayment;
        return (debt > 0) ? 0 : _abs(debt);
    }

    /// @notice Returns the exchange fee as returned by the exchange
    /// @dev This is in quote token decimals
    /// @return uint256 The exchange fee
    function getExchangeFee() external view returns (uint256) {
        return marketRegistry.getFeeRatio(market);
    }

    /// @notice Returns the exchange fee normalized to WAD 10^18
    /// @dev 100% = 10^18
    /// @return uint256 The exchange fee normalized to a WAD.
    function getExchangeFeeWad() public view returns (uint256) {
        uint256 feeRatio = marketRegistry.getFeeRatio(market);
        return feeRatio.mulWadUp(WAD).divWadDown(HUNDRED_PERCENT);
    }

    /// @notice Returns the PERP fee for a given amount
    /// @dev This is calculated using the fee ratio from the PERP
    /// `MarketRegistry` contract.
    /// @param amount The amount to calculate the fee for
    /// @return The PERP fee for a given amount
    function _calculatePerpOrderFeeAmount(uint256 amount)
        internal
        view
        returns (uint256)
    {
        return amount.mulWadUp(getExchangeFeeWad());
    }

    function _checkSoftCap() private view {
        if (redeemableUnderManagement > redeemableSoftCap) {
            revert RedeemableSoftCapHit(
                redeemableSoftCap,
                redeemableUnderManagement
            );
        }
    }

    function _abs(int256 value) private pure returns (uint256) {
        return value >= 0 ? uint256(value) : uint256(-1 * value);
    }

    ///////////////////////////////////////////////////////////////////////
    ///                         Upgrades
    ///////////////////////////////////////////////////////////////////////

    /// @dev Returns the current version of this contract
    // solhint-disable-next-line func-name-mixedcase
    function VERSION() external pure virtual returns (uint8) {
        return 1;
    }

    /// @dev called on upgrade. only owner can call upgrade function
    function _authorizeUpgrade(address)
        internal
        virtual
        override
        onlyOwner
    // solhint-disable-next-line no-empty-blocks
    {

    }

    function transferOwnership(address newOwner) public override(IDepository, OwnableUpgradeable) onlyOwner {
        super.transferOwnership(newOwner);
    }
}
