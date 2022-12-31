// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.17;

struct SwapParams {
    address tokenIn;
    address tokenOut;
    uint256 amountIn;
    uint256 amountOutMinimum;
    uint160 sqrtPriceLimitX96;
    uint24 poolFee;
}

interface ISwapper {
    function swapExactInput(SwapParams memory params) external returns (uint256 amountOut);
}
