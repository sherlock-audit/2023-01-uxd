// SPDX-License-Identifier: BUSL-1.1-3.0-or-later
pragma solidity ^0.8.17;

import {UXDController} from "../core/UXDController.sol";

contract TestUXDControllerUpgrade is UXDController {

     /// @dev Returns the current version of this contract
    // solhint-disable-next-line func-name-mixedcase
    function VERSION() external override virtual pure returns (uint8) {
        return 2;
    }

}