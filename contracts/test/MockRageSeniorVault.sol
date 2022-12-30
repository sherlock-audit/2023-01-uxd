// SPDX-License-Identifier: BUSL-1.1-3.0-or-later
pragma solidity ^0.8.17;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockRageSeniorVault {

    event Deposited(uint256 amount, address indexed to);
    event Withdrawn(uint256 amount, address indexed receiver, address indexed owner);

    address public asset;
    address public depository;
    uint256 public profits;
    mapping(address => uint) public balances;

    function initialize(address _token) external {
        asset = _token;
    }

    function setDepository(address _depository) external {
        depository = _depository;
    }

    function deposit(uint256 amount, address to) external returns (uint) {
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        emit Deposited(amount, to);
        balances[to] += amount;
        return amount;
    }

    function withdraw(
        uint256 amount,
        address receiver,
        address owner
    ) public returns (uint256) {
        balances[owner] -= amount;
        IERC20(asset).transfer(receiver, amount);
        emit Withdrawn(amount, receiver, owner);
        return amount;
    }

    function convertToAssets(uint256 shares) external pure returns (uint256) {
        return shares;
    }

    function addProfits(uint256 amount) external {
        profits += amount;
        balances[depository] += amount;
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
    }

    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }
}
