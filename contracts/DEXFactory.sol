// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./DEXPair.sol";

contract DEXFactory {
    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, "Same token");
        require(getPair[tokenA][tokenB] == address(0), "Pair exists");

        DEXPair newPair = new DEXPair(tokenA, tokenB);
        pair = address(newPair);

        getPair[tokenA][tokenB] = pair;
        getPair[tokenB][tokenA] = pair;
        allPairs.push(pair);
    }
}
