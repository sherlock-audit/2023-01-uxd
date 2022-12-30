// SPDX-License-Identifier: BUSL-1.1-3.0-or-later
pragma solidity ^0.8.17;

contract TestWETH9 {

    address public owner;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;

    constructor() {
        owner = msg.sender;
        totalSupply = 0;
    }

    function deposit() public payable {
        require(msg.value > 0, "0 or negative value.");
        balanceOf[msg.sender] += msg.value;
        totalSupply += msg.value;
    }

    function withdraw(uint256 _amount) public {
        require(_amount > 0, "0 or negative value.");
        require(_amount <= balanceOf[msg.sender], "Insufficient balance.");
        balanceOf[msg.sender] -= _amount;
        totalSupply -= _amount;
        payable(msg.sender).transfer(_amount);
    }

    function transfer(address _to, uint256 _amount) public returns (bool) {
        require(_amount > 0, "0 or negative value.");
        require(_amount <= balanceOf[msg.sender], "Insufficient balance.");
        balanceOf[msg.sender] -= _amount;
        balanceOf[_to] += _amount;
        return true;
    }
}
