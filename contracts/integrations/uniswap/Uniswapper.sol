// SPDX-License-Identifier: BUSL-1.1-2.0-or-later
pragma solidity ^0.8.17;

import {TransferHelper} from "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import {ISwapRouter} from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import {ISwapper, SwapParams} from "../ISwapper.sol";

/// @title Uniswapper
/// @dev Perform spot swap on Uniswap v3
contract Uniswapper is ISwapper {
    
    /// @dev uniswap router
    ISwapRouter public immutable swapRouter;

    constructor(ISwapRouter _swapRouter) {
        swapRouter = _swapRouter;
    }

    /// @notice swapExactInputSingle swaps a fixed amount of tokenIn for a maximum possible amount of tokenOut
    /// using the tokenIn/tokenOut poolfee pool by calling `exactInputSingle` in the swap router.
    /// @dev The calling address must approve this contract to spend at least `amountIn` worth of its tokenIn for this function to succeed.
    /// @param params The parameters for the swap
    /// @return amountOut The amount of tokenOut received.
    function swapExactInput(SwapParams memory params) external returns (uint256 amountOut) {
        // msg.sender must approve this contract

        // Transfer the specified amount of tokenIn to this contract.
        TransferHelper.safeTransferFrom(params.tokenIn, msg.sender, address(this), params.amountIn);

        // Approve the router to spend tokenIn.
        TransferHelper.safeApprove(params.tokenIn, address(swapRouter), params.amountIn);

        ISwapRouter.ExactInputSingleParams memory uniswapParams =
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenIn,
                tokenOut: params.tokenOut,
                fee: params.poolFee,
                recipient: msg.sender,
                deadline: block.timestamp,
                amountIn: params.amountIn,
                amountOutMinimum: params.amountOutMinimum,
                sqrtPriceLimitX96: params.sqrtPriceLimitX96
            });

        amountOut = swapRouter.exactInputSingle(uniswapParams);
    }
}
