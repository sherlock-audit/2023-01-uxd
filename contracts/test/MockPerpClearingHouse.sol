// SPDX-License-Identifier: BUSL-1.1-3.0-or-later
pragma solidity ^0.8.17;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IClearingHouse} from "../external/perp/IClearingHouse.sol";

contract MockPerpClearingHouse {

    address private accountnBalance;
    address private exchange;
    
    uint256 public multiplier = 100;
    uint256 public accountValue;

    event OpenPositionCalled(
        address baseToken,
        bool isBaseToQuote,
        bool isExactInput,
        uint256 amount,
        uint256 oppositeAmountBound,
        uint256 deadline,
        uint160 sqrtPriceLimitX96,
        bytes32 referralCode
    );

    function setAccountBalance(address balanceContract) public {
        accountnBalance = balanceContract;
    }

    function setExchange(address exchangeContract) public {
        exchange = exchangeContract;
    }

    function getExchange() public view returns (address) {
        return exchange;
    }

    function getAccountBalance() external view returns (address) {
        return accountnBalance;
    }

    function getAccountValue(address) external view returns (uint256) {
        return accountValue;
    }

    function openPosition(IClearingHouse.OpenPositionParams memory params) external returns (uint256, uint256) {
        accountValue += params.amount;
        emit OpenPositionCalled(
            params.baseToken,
            params.isBaseToQuote,
            params.isExactInput,
            params.amount,
            params.oppositeAmountBound,
            params.deadline,
            params.sqrtPriceLimitX96,
            params.referralCode
        );
        
        return (params.amount, params.amount * multiplier);
    }
}
