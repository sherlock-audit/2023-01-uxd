// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.17;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {IERC20, IERC20Metadata, ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {IDnGmxSeniorVault} from "../../external/rage-trade/IDnGmxSeniorVault.sol";
import {IDepository} from "../IDepository.sol";
import {IUXDController} from "../../core/IUXDController.sol";
import {MathLib} from "../../libraries/MathLib.sol";
import {RageDnDepositoryStorage} from "./RageDnDepositoryStorage.sol";

/// @title RageDnDepository
/// @notice Manages interactions with Rage Trade.
contract RageDnDepository is
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable,
    OwnableUpgradeable,
    RageDnDepositoryStorage
{
    using MathLib for uint256;
    using AddressUpgradeable for address;
    using SafeERC20Upgradeable for IERC20;
    using SafeERC20Upgradeable for ERC20;

    error NoProfits(int256 pnl);
    error NotApproved(uint256 allowance, uint256 amount);
    error NotController(address caller);
    error NotContractAddress(address addr);
    error UnsupportedAsset(address asset);
    error RedeemableSoftCapHit(uint256 softcap, uint256 totalRedeemable);
    error TokenTransferFail(address token, address from, address to);

    ///////////////////////////////////////////////////////////////////
    ///                         Events
    ///////////////////////////////////////////////////////////////////
    event Deposited(
        address indexed caller,
        uint256 assets,
        uint256 redeemable,
        uint256 shares
    );
    event Withdrawn(
        address indexed caller,
        uint256 assets,
        uint256 redeemable,
        uint256 shares
    );
    event Redeemed(
        address indexed caller,
        uint256 assets,
        uint256 redeemable,
        uint256 shares
    );
    event RedeemableSoftCapUpdated(address indexed caller, uint256 newSoftCap);

    /// @notice Constructor
    /// @param _vault the address of the Rage Senior vault
    /// @param _controller the address of the UXDController
    function initialize(address _vault, address _controller) external virtual initializer {
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        __Ownable_init();

        if (!_vault.isContract()) {
            revert NotContractAddress(_vault);
        }
        if (!_controller.isContract()) {
            revert NotContractAddress(_controller);
        }
        vault = IDnGmxSeniorVault(_vault);
        controller = IUXDController(_controller);
        assetToken = vault.asset();
        redeemable = address(controller.redeemable());
    }

    /// @dev restirct access to controller
    modifier onlyController() {
        if (msg.sender != address(controller)) {
            revert NotController(msg.sender);
        }
        _;
    }

    /// @notice Sets the redeemable soft cap
    /// @dev Can only be called by owner
    /// @param softCap The new redeemable soft cap
    function setRedeemableSoftCap(uint256 softCap) external onlyOwner {
        redeemableSoftCap = softCap;
        emit RedeemableSoftCapUpdated(msg.sender, softCap);
    }

    /// @notice Deposits assets
    /// @param assetAmount The amount of assets to deposit in assetToken.decimals()
    /// @return redeemableAmount the corresponding amount of redeemable for asset deposited
    function deposit(address asset, uint256 assetAmount)
        external
        onlyController
        returns (uint256)
    {
        if (asset != assetToken) {
            revert UnsupportedAsset(asset);
        }
        netAssetDeposits += assetAmount;
        IERC20(assetToken).approve(address(vault), assetAmount);
        uint256 shares = vault.deposit(assetAmount, address(this));
        uint256 redeemableAmount = _assetsToRedeemable(assetAmount);
        redeemableUnderManagement += redeemableAmount;
        _checkSoftCap();
        emit Deposited(msg.sender, assetAmount, redeemableAmount, shares);
        return redeemableAmount;
    }

    /// @notice Redeem a given amount.
    /// @param redeemableAmount The amount to redeem in redeemable.decimals()
    /// @return assetAmount The asset amount withdrawn by this redemption
    function redeem(address asset, uint256 redeemableAmount)
        external
        onlyController
        returns (uint256)
    {
        if (asset != assetToken) {
            revert UnsupportedAsset(asset);
        }
        uint256 assetAmount = _redeemableToAssets(redeemableAmount);
        redeemableUnderManagement -= redeemableAmount;
        netAssetDeposits -= assetAmount;
        uint256 shares = vault.withdraw(
            assetAmount,
            address(controller),
            address(this)
        );
        emit Withdrawn(msg.sender, assetAmount, redeemableAmount, shares);
        return assetAmount;
    }

    /// @dev returns assets deposited. IDepository required.
    function assetsDeposited() external view returns (uint256) {
        return netAssetDeposits;
    }

    /// @dev returns the shares currently owned by this depository
    function getDepositoryShares() external view returns (uint256) {
        return vault.balanceOf(address(this));
    }

    /// @dev returns the assets currently owned by this depository.
    function getDepositoryAssets() public view returns (uint256) {
        return vault.convertToAssets(vault.balanceOf(address(this)));
    }

    /// @dev the difference between curent vault assets and amount deposited
    function getUnrealizedPnl() public view returns (int256) {
        return int256(getDepositoryAssets()) - int256(netAssetDeposits);
    }

    /// @dev Withdraw profits. Ensure redeemable is still fully backed by asset balance after this is run.
    /// TODO: Remove this function. Code profit access and use in contracts
    function withdrawProfits(address receiver) external onlyOwner nonReentrant {
        int256 pnl = getUnrealizedPnl();
        if (pnl <= 0) {
            revert NoProfits(pnl);
        }
        uint256 profits = uint256(pnl);
        vault.withdraw(profits, receiver, address(this));
        realizedPnl += profits;
    }

    function _assetsToRedeemable(uint256 assetAmount)
        private
        view
        returns (uint256)
    {
        return
            assetAmount.fromDecimalToDecimal(
                IERC20Metadata(assetToken).decimals(),
                IERC20Metadata(redeemable).decimals()
            );
    }

    function _redeemableToAssets(uint256 redeemableAmount)
        private
        view
        returns (uint256)
    {
        return
            redeemableAmount.fromDecimalToDecimal(
                IERC20Metadata(redeemable).decimals(),
                IERC20Metadata(assetToken).decimals()
            );
    }

    function _checkSoftCap() private view {
        if (redeemableUnderManagement > redeemableSoftCap) {
            revert RedeemableSoftCapHit(
                redeemableSoftCap,
                redeemableUnderManagement
            );
        }
    }

    /// @notice Transfers contract ownership to a new address
    /// @dev This can only be called by the current owner.
    /// @param newOwner The address of the new owner.
    function transferOwnership(address newOwner)
        public
        override(IDepository, OwnableUpgradeable)
        onlyOwner
    {
        super.transferOwnership(newOwner);
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
}
