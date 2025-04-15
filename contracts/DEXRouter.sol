// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./DEXFactory.sol";
import "./DEXPair.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DEXRouter {
    DEXFactory public factory;

    constructor(address _factory) {
        factory = DEXFactory(_factory);
    }

    function addLiquidity(address tokenA, address tokenB, uint amountA, uint amountB) external {
        address pair = factory.getPair(tokenA, tokenB);
        require(pair != address(0), "Pair doesn't exist");

        IERC20(tokenA).transferFrom(msg.sender, pair, amountA);
        IERC20(tokenB).transferFrom(msg.sender, pair, amountB);
        DEXPair(pair).addLiquidity(amountA, amountB);
    }

    function removeLiquidity(address tokenA, address tokenB, uint liquidity) external {
        address pair = factory.getPair(tokenA, tokenB);
        require(pair != address(0), "Pair doesn't exist");

        IERC20(pair).transferFrom(msg.sender, pair, liquidity);
        DEXPair(pair).removeLiquidity(liquidity);
    }

    function swap(address tokenIn, address tokenOut, uint amountIn) external {
        address pair = factory.getPair(tokenIn, tokenOut);
        require(pair != address(0), "Pair doesn't exist");

        IERC20(tokenIn).transferFrom(msg.sender, pair, amountIn);
        DEXPair(pair).swap(amountIn, tokenIn);
    }
}
