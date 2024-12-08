// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Lottery is ReentrancyGuard {
    address public owner;
    IERC20 public uzarToken;
    address payable[] public players;
    uint public lotteryId;
    mapping(uint => address payable) public lotteryHistory;

    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function");
        _;
    }

    constructor(address _uzarTokenAddress) {
        owner = msg.sender;
        uzarToken = IERC20(_uzarTokenAddress);
        lotteryId = 1;
    }




    function getWinnerByLottery(uint _lottery) public view returns (address payable) {
        return lotteryHistory[_lottery];
    }

    function getPlayers() public view returns (address payable[] memory) {
        return players;
    }

    function enter() public nonReentrant { 
        uzarToken.transferFrom(msg.sender, address(this), 5 * 10**18);
        players.push(payable(msg.sender));
    }

    function getRandomNumber() private view returns (uint) {
        return uint(keccak256(abi.encodePacked(block.prevrandao, block.timestamp, players.length)));
    }

    function pickWinner() public onlyOwner nonReentrant {
        require(players.length > 0, "No players in the lottery");

        uint index = getRandomNumber() % players.length;
        address payable winner = players[index];

        uint prizePool = uzarToken.balanceOf(address(this));
        uint winnerAmount = prizePool;
        uzarToken.transfer(winner, winnerAmount); 
        lotteryHistory[lotteryId] = winner;
        lotteryId++;
        players = new address payable[](0) ;
    }
}

