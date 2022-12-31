// SPDX-License-Identifier: BUSL-1.1-3.0-or-later
pragma solidity ^0.8.17;

import {ISwapRouter} from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

contract MockUniswapRouter {

    function exactInputSingle(ISwapRouter.ExactInputSingleParams memory params) external pure returns (uint256 amountOut) {
        return params.amountOutMinimum;
    }
}
