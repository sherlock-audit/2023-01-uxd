// SPDX-License-Identifier: BUSL-1.1-3.0-or-later
pragma solidity ^0.8.17;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockPerpExchange {

    receive() external payable {}

    function getAllPendingFundingPayment(address) external pure returns (uint256) {
        return 100 * 10 ** 18;
    }

    function getSqrtMarkTwapX96(address, uint32) external pure returns (uint160) {
        return 0;
    }
}
