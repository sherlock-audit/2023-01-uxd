// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.17;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {OFT} from "../external/layer-zero/token/oft/OFT.sol";

/// @title UXPToken
/// @notice UXP public governance token
contract UXPToken is Ownable, OFT, ERC20Permit, ERC20Votes {

    error NotApproved(uint256 allowance, uint256 spendAmount);

    /// @notice Constructor
    /// @dev Explain to a developer any extra details
    /// @param custodian Address to mint initial supply to if > 0
    /// @param initialTotalSupply Initial supply. Minted to `custodian`.
    /// @param lzEndpoint LayerZero endpoint 
    constructor(address custodian, uint256 initialTotalSupply, address lzEndpoint) OFT("UXD Governance Token", "UXP", lzEndpoint) ERC20Permit("UXP") {
        if (initialTotalSupply != 0) {
            _mint(custodian, initialTotalSupply);
        }
    }

    /// @notice Mint new tokens to an address
    /// @dev Can only be called by owner.
    /// @param account the address to mint to
    /// @param amount the amount to mint
    function mint(address account, uint256 amount) external onlyOwner {
        _mint(account, amount);
    }

    /// @notice Burn tokens from an address 
    /// @dev Can only be called by owner. `account` must have approved the caller to spend `amount`.
    /// @param account the address to burn from
    /// @param amount the amount to burn
    function burn(address account, uint256 amount) external onlyOwner {
        if (account != msg.sender) {
            _spendAllowance(account, msg.sender, amount);
        }
        _burn(account, amount);
    }

    // The functions below are overrides required by Solidity.

    function _afterTokenTransfer(address from, address to, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(address to, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._burn(account, amount);
    }
}
