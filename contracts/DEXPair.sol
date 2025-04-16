// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DEXPair is ERC20 {
    address public token0;
    address public token1;
    uint112 public reserve0;
    uint112 public reserve1;

    constructor(address _token0, address _token1) ERC20("LP Token", "LPT") {
        token0 = _token0;
        token1 = _token1;
    }

    function _updateReserves() internal {
        reserve0 = uint112(IERC20(token0).balanceOf(address(this)));
        reserve1 = uint112(IERC20(token1).balanceOf(address(this)));
    }

    function addLiquidity(uint amount0, uint amount1, address to) external returns (uint liquidity) {
        IERC20(token0).transferFrom(msg.sender, address(this), amount0);
        IERC20(token1).transferFrom(msg.sender, address(this), amount1);

        if (totalSupply() == 0) {
            liquidity = sqrt(amount0 * amount1);
        } else {
            liquidity = min(
                (amount0 * totalSupply()) / reserve0,
                (amount1 * totalSupply()) / reserve1
            );
        }

        require(liquidity > 0, "Insufficient liquidity");
        _mint(to, liquidity);
        _updateReserves();
    }

    function removeLiquidity(uint liquidity) external returns (uint amount0, uint amount1) {
        uint total = totalSupply();
        amount0 = (reserve0 * liquidity) / total;
        amount1 = (reserve1 * liquidity) / total;

        _burn(msg.sender, liquidity);

        IERC20(token0).transfer(msg.sender, amount0);
        IERC20(token1).transfer(msg.sender, amount1);
        _updateReserves();
    }

    function swap(uint amountIn, address fromToken, address to) external {
        require(amountIn > 0, "Invalid input");

        bool isToken0 = fromToken == token0;
        (address input, address output, uint reserveIn, uint reserveOut) =
            isToken0 ? (token0, token1, reserve0, reserve1) : (token1, token0, reserve1, reserve0);

        IERC20(input).transferFrom(msg.sender, address(this), amountIn);

        uint amountInWithFee = amountIn * 997;
        uint amountOut = (amountInWithFee * reserveOut) / (reserveIn * 1000 + amountInWithFee);

        IERC20(output).transfer(to, amountOut);
        _updateReserves();
    }

    function sqrt(uint y) internal pure returns (uint z) {
        if (y > 3) {
            z = y;
            uint x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    function min(uint x, uint y) internal pure returns (uint z) {
        z = x < y ? x : y;
    }
}
