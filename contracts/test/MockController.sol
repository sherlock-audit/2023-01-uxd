// SPDX-License-Identifier: BUSL-1.1-3.0-or-later
pragma solidity ^0.8.17;

import {IDepository} from "../integrations/IDepository.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockController {

    IDepository public depository;
    address public redeemable;

    function updateDepository(address _depository) external {
        depository = IDepository(_depository);
    }

    function setRedeemable(address _redeemable) external {
        redeemable = _redeemable;
    }

    function deposit(address token, uint256 amount) external {
        depository.deposit(token, amount);
    }

    function withdraw(address token, uint256 amount, address receiver) external {
        uint256 amountOut = depository.redeem(token, amount);
        IERC20(token).transfer(receiver, amountOut);
    }
}

