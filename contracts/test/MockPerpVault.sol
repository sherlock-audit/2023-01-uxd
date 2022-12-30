// SPDX-License-Identifier: BUSL-1.1-3.0-or-later
pragma solidity ^0.8.17;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockPerpVault {

    event DepositCalled();

    uint256 public balance;
    mapping (address => uint) private _freeCollateral;
    mapping (address => mapping(address => uint)) private _freeCollateralByToken;
    mapping (address => mapping(address => uint)) private _balanceByToken;

    function deposit(address token, uint256 amount) external {
        balance += amount;
        IERC20(token).transferFrom(msg.sender, address(this), amount);
    }

    function withdraw(address token, uint256 amount) external {
        balance -= amount;
        IERC20(token).transfer(msg.sender, amount);
    }

    function getBalance(address) external view returns (uint256) {
        return balance;
    }
    
    function setFreeCollateral(address account, uint256 amount) external {
        _freeCollateral[account] = amount;
    }

    function getFreeCollateral(address account) external view returns (uint256) {
        return _freeCollateral[account];
    }

    function setFreeCollateralByToken(address account, address token, uint256 amount) external {
        _freeCollateralByToken[account][token] = amount;
    }

    function getFreeCollateralByToken(address account, address token) external view returns (uint256) {
        return _freeCollateralByToken[account][token];
    }

    function setBalanceByToken(address account, address token, uint256 amount) external {
        _balanceByToken[account][token] = amount;
    }

    function getBalanceByToken(address account, address token) external view returns (uint256) {
        return _balanceByToken[account][token];
    }
}
