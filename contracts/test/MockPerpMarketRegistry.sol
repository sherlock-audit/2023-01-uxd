// SPDX-License-Identifier: BUSL-1.1-3.0-or-later
pragma solidity ^0.8.17;

contract MockPerpMarketRegistry {
    
    function getFeeRatio(address) external pure returns (uint256) {
        return 10 * 1e6;
    }
}