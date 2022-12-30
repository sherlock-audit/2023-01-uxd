// SPDX-License-Identifier: BUSL-1.1-3.0-or-later
pragma solidity ^0.8.17;

contract MockPerpAccountBalance {

    // account => market => notional value
    mapping (address => mapping (address => int256)) private _openNotional;
    mapping (address => int256) private _absPositionValue;
    mapping (address => int256[]) private _pnlAndPendingFee;
    mapping (address => uint256) private _debtValue;
    uint256 private _totalPositionValue;
    uint256 private _positionSize;
    address private _vault;

    constructor(address vault) {
        _vault = vault;
    }

    function getVault() external view returns (address) {
        return _vault;
    }

    function setOpenNotional(address account, address market, int256 value) external {
        _openNotional[account][market] = value;
    }

    function getTotalOpenNotional(address account, address market)
        external
        view
        returns (int256 totalOpenNotional)
    {
        return _openNotional[account][market];
    }

    function setTotalPositionValue(uint256 positionValue) external {
        _totalPositionValue = positionValue;
    }

    function getTotalPositionValue(address, address) external view returns (uint256) {
        return _totalPositionValue;
    }

    function setTotalPositionSize(uint256 positionSize) external {
        _positionSize = positionSize;
    }

    function getTotalPositionSize(address, address) external view returns (uint256) {
        return _positionSize;
    }

    function getTotalDebtValue(address account) external view returns (uint256) {
        return _debtValue[account];
    }

    function setTotalDebtValue(address account, uint256 debtValue) external {
        _debtValue[account] = debtValue;
    }

    function setPnlAndPendingFee(address account, int256[] memory pnlAndFees) external {
        require (pnlAndFees.length == 3, "invalid pnl and fees");
        _pnlAndPendingFee[account] = pnlAndFees;
    }

    function getPnlAndPendingFee(address account) external view returns (int256, int256, int256) {
        int256[] storage pnlAndFees = _pnlAndPendingFee[account];
        if (pnlAndFees.length != 3) {
            return (0, 0, 0);
        }
        return (pnlAndFees[0], pnlAndFees[1], pnlAndFees[2]);
    }

    function setTotalAbsPositionValue(address account, int256 positionValue) external {
        _absPositionValue[account] = positionValue;
    }

    function getTotalAbsPositionValue(address account) external view returns (int256) {
        return _absPositionValue[account];
    }

}
