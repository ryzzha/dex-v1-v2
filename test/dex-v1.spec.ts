import { ethers } from "hardhat";
import { expect } from "chai";
import { format } from "path";

describe("DEX V1", () => {
  let dex: any;
  let token: any;
  let owner: any;
  let user: any;
  let userok: any;

  beforeEach(async () => {
    [owner, user, userok] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("ERC20Mock");
    token = await Token.deploy("TestToken", "TT", owner.address, ethers.parseEther("100000"));

    const DEX = await ethers.getContractFactory("DEX");
    dex = await DEX.deploy(token.target);

    await token.connect(owner).transfer(user.address, ethers.parseEther("25000"));
    await token.connect(owner).transfer(userok.address, ethers.parseEther("25000"));
    await token.connect(owner).approve(dex.target, ethers.parseEther("30000"));
    await dex.connect(owner).addLiquidity(ethers.parseUnits("5000"), { value: ethers.parseEther("555") });
  });

  it("should add liquidity and mint LP tokens and remove liquidity and return tokens and ETH", async () => {
    const lpBalanceBefore = await dex.balanceOf(userok.address);
    console.log("userok lp balance before add liquidity -> " + ethers.formatUnits(lpBalanceBefore));

    const tokenReserve = await dex.getTokenInContract();
    const ethReserve = await ethers.provider.getBalance(dex.target);
    const ethToAdd = ethers.parseEther("100");
    const requiredToken = ethToAdd * tokenReserve / ethReserve;

    await token.connect(userok).approve(dex.target, requiredToken);
    await dex.connect(userok).addLiquidity(requiredToken, { value: ethToAdd });

    const lpBalanceAfter = await dex.balanceOf(userok.address);
    console.log("userok lp balance after add liquidity -> " + ethers.formatUnits(lpBalanceAfter));

    const tokenReserve_2 = await dex.getTokenInContract();
    const ethReserve_2 = await ethers.provider.getBalance(dex.target);
    const ethToAdd_2 = ethers.parseEther("555");
    const requiredToken_2 = ethToAdd_2 * tokenReserve_2 / ethReserve_2;

    await token.connect(user).approve(dex.target, requiredToken_2);
    await dex.connect(user).addLiquidity(requiredToken_2, { value: ethToAdd_2 });

    const lpTotalSupply = await dex.totalSupply();
    console.log("lpTotalSupply -> " + ethers.formatUnits(lpTotalSupply));

    expect(lpBalanceAfter).to.be.gt(0);

    const lpAmount = await dex.balanceOf(userok.address);
    await dex.connect(userok).removeLiquidity(lpAmount);
    const tokenBalance = await token.balanceOf(userok.address);
    expect(tokenBalance).to.be.gt(0);
  });

  it("should allow swapping ETH to tokens", async () => {
    const balanceBefore = await token.balanceOf(user.address);
    console.log("user token balance before swap eth to this token -> " + ethers.formatUnits(balanceBefore));

    await dex.connect(user).swapEthToTokens({ value: ethers.parseEther("500") });

    const balanceAfter = await token.balanceOf(user.address);
    console.log("user token balance after swap eth to this token -> " + ethers.formatUnits(balanceAfter));

    expect(balanceAfter).to.be.gt(balanceBefore);
  });

  it("should allow swapping tokens to ETH", async () => {
    const balanceBefore = await ethers.provider.getBalance(user.address);
    console.log("user token balance before swap token to ether -> " + ethers.formatEther(balanceBefore));

    await token.connect(user).approve(dex.target, ethers.parseEther("1250"));
    await dex.connect(user).swapTokenToEth(ethers.parseUnits("1250"));

    const balanceAfter = await ethers.provider.getBalance(user.address);
    console.log("user token balance after swap token to ether -> " + ethers.formatEther(balanceAfter));

    expect(balanceAfter).to.be.gt(balanceBefore);
  });

  it(":)", async () => {
    // how change proportion after buy big amount 1 token
    const tokenReserve = await dex.getTokenInContract();
    const ethReserve = await ethers.provider.getBalance(dex.target);

    const receiveEthFromToken = getAmountOfToken(ethers.parseUnits("100"), tokenReserve, ethReserve);
    console.log("must send eth to 100 tokens -> " + ethers.formatEther(receiveEthFromToken));

    await token.connect(owner).approve(dex.target, ethers.parseEther("3200"));
    await dex.connect(owner).swapTokenToEth(ethers.parseUnits("3200"));

    const tokenReserve_after = await dex.getTokenInContract();
    const ethReserve_after = await ethers.provider.getBalance(dex.target);

    const receiveEthFromToken_after = getAmountOfToken(ethers.parseUnits("100"), tokenReserve_after, ethReserve_after);
    console.log("must send eth to 100 tokens after kit buy most pool eth reserves -> " + ethers.formatEther(receiveEthFromToken_after));

    await dex.connect(user).swapEthToTokens({ value: ethers.parseUnits("6500") });

    const tokenReserve_again = await dex.getTokenInContract();
    const ethReserve_again = await ethers.provider.getBalance(dex.target);

    const receiveEthFromToken_again = getAmountOfToken(ethers.parseUnits("100"), tokenReserve_again, ethReserve_again);
    console.log("must send eth to 100 tokens after kit buy most pool tokens reserves -> " + ethers.formatEther(receiveEthFromToken_again));
  });
});

function getAmountOfToken(inputAmount: bigint, inputReserve: bigint, outputReserve: bigint) {
    if(inputReserve <= 0 && outputReserve <= 0) {
      console.error("Invalid reserves")
    }

    const inputAmountWithFee = inputAmount * 99n;
    const numerator = inputAmountWithFee * outputReserve;
    const denominator = (inputReserve * 100n) + inputAmountWithFee;

    return numerator / denominator;
}
