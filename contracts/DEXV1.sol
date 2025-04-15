// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DEX is ERC20 {
    address public token;

    constructor(address _token)
        ERC20("Liquidity Provider Token", "LPT")
    {
        token = _token;
    }

    function getTokenInContract() public view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    function addLiquidity(uint256 _amount) external payable returns (uint256 liquidity) {
        uint256 balanceEth = address(this).balance;
        uint256 tokenReserve = getTokenInContract();
        IERC20 _token = IERC20(token);

        if (tokenReserve == 0) {
            _token.transferFrom(msg.sender, address(this), _amount);
            liquidity = balanceEth;
            _mint(msg.sender, liquidity);
        } else {
            uint256 reservedEth = balanceEth - msg.value;
            uint256 requiredTokenAmount = (msg.value * tokenReserve) / reservedEth;

            require(_amount >= requiredTokenAmount, "Insufficient token amount");

            _token.transferFrom(msg.sender, address(this), _amount);
            liquidity = (totalSupply() * msg.value) / reservedEth;
            _mint(msg.sender, liquidity);
        }

        return liquidity;
    }

    function removeLiquidity(uint256 _amount) external returns (uint256 ethAmount, uint256 tokenAmount) {
        require(_amount > 0, "Cannot remove 0");

        uint256 ethReserve = address(this).balance;
        uint256 tokenReserve = getTokenInContract();
        uint256 totalLPT = totalSupply();

        ethAmount = (ethReserve * _amount) / totalLPT;
        tokenAmount = (tokenReserve * _amount) / totalLPT;

        _burn(msg.sender, _amount);

        payable(msg.sender).transfer(ethAmount);
        IERC20(token).transfer(msg.sender, tokenAmount);
    }

    function getAmountOfToken(uint256 inputAmount, uint256 inputReserve, uint256 outputReserve)
        public pure returns (uint256)
    {
        require(inputReserve > 0 && outputReserve > 0, "Invalid reserves");

        uint256 inputAmountWithFee = inputAmount * 99; // 1% fee
        uint256 numerator = inputAmountWithFee * outputReserve;
        uint256 denominator = (inputReserve * 100) + inputAmountWithFee;

        return numerator / denominator;
    }

    function swapEthToTokens() public payable {
        uint256 tokenReserve = getTokenInContract();
        uint256 tokensBought = getAmountOfToken(msg.value, address(this).balance - msg.value, tokenReserve);

        IERC20(token).transfer(msg.sender, tokensBought);
    }

    function swapTokenToEth(uint256 tokenSold) public {
        uint256 tokenReserve = getTokenInContract();
        uint256 ethBought = getAmountOfToken(tokenSold, tokenReserve, address(this).balance);

        IERC20(token).transferFrom(msg.sender, address(this), tokenSold);
        payable(msg.sender).transfer(ethBought);
    }

    receive() external payable {}
}
