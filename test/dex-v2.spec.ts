import { ethers } from "hardhat";
import { expect } from "chai";

describe("DEX V2 – Factory, Pair, Router", () => {
  let tokenA: any;
  let tokenB: any;
  let factory: any;
  let router: any;
  let pair: any;
  let owner: any;
  let user: any;
  let userok: any;

  beforeEach(async () => {
    [owner, user, userok] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("ERC20Mock");
    tokenA = await Token.deploy("TokenA", "A", owner.address, ethers.parseEther("100000"));
    tokenB = await Token.deploy("TokenB", "B", owner.address, ethers.parseEther("100000"));

    await tokenA.waitForDeployment();
    await tokenB.waitForDeployment();

    const tokenAAddress = await tokenA.getAddress();
    const tokenBAddress = await tokenB.getAddress();

    const Factory = await ethers.getContractFactory("DEXFactory");
    factory = await Factory.deploy();
    await factory.waitForDeployment();

    const Router = await ethers.getContractFactory("DEXRouter");
    router = await Router.deploy(factory.target);
    await router.waitForDeployment();

    await factory.createPair(tokenAAddress, tokenBAddress);
    const pairAddress = await factory.getPair(tokenAAddress, tokenBAddress);

    pair = await ethers.getContractAt("DEXPair", pairAddress);

    await tokenA.connect(owner).approve(user.address, ethers.parseEther("30000"));
    await tokenA.connect(owner).approve(userok.address, ethers.parseEther("30000"));
    await tokenB.connect(owner).approve(user.address, ethers.parseEther("30000"));
    await tokenB.connect(owner).approve(userok.address, ethers.parseEther("30000"));

    await tokenA.connect(owner).transfer(user.address, ethers.parseEther("30000"));
    await tokenB.connect(owner).transfer(user.address, ethers.parseEther("30000"));
    await tokenA.connect(owner).transfer(userok.address, ethers.parseEther("30000"));
    await tokenB.connect(owner).transfer(userok.address, ethers.parseEther("30000"));

  });

  describe("Factory", () => {
    it("should create a pair correctly", async () => {
      const pairAddress = await factory.getPair(tokenA.target, tokenB.target);
      expect(pairAddress).to.not.equal(ethers.ZeroAddress);
    });
  });

  describe("Pair", () => {
    it("should add liquidity and mint LP tokens", async () => {
      await tokenA.connect(user).approve(pair.target, ethers.parseEther("1000"));
      await tokenB.connect(user).approve(pair.target, ethers.parseEther("2000"));
      await pair.connect(user).addLiquidity(ethers.parseEther("1000"), ethers.parseEther("2000"), user.address);

      const lp = await pair.balanceOf(user.address);
      expect(lp).to.be.gt(0);
    });

    it("should swap TokenA to TokenB", async () => {
      await tokenA.connect(user).approve(pair.target, ethers.parseEther("1000"));
      await tokenB.connect(user).approve(pair.target, ethers.parseEther("2000"));
      await pair.connect(user).addLiquidity(ethers.parseEther("1000"), ethers.parseEther("2000"), user.address);

      const tokenBBefore = await tokenB.balanceOf(userok.address);

      await tokenA.connect(userok).approve(pair.target, ethers.parseEther("500"));
      await pair.connect(userok).swap(ethers.parseEther("500"), tokenA.target, userok.address);

      const tokenBAfter = await tokenB.balanceOf(userok.address);
      expect(tokenBAfter).to.be.gt(tokenBBefore);
    });

    it("should remove liquidity and return tokens", async () => {
      await tokenA.connect(user).approve(pair.target, ethers.parseEther("1000"));
      await tokenB.connect(user).approve(pair.target, ethers.parseEther("2000"));
      await pair.connect(user).addLiquidity(ethers.parseEther("1000"), ethers.parseEther("2000"), user.address);

      const lp = await pair.balanceOf(owner.address);
      await pair.connect(user).removeLiquidity(lp);

      const tokenABalance = await tokenA.balanceOf(owner.address);
      const tokenBBalance = await tokenB.balanceOf(owner.address);

      expect(tokenABalance).to.be.gt(0);
      expect(tokenBBalance).to.be.gt(0);
    });
  });

  describe("Router", () => {
    it("should add liquidity through router", async () => {
      await tokenA.connect(user).approve(router.target, ethers.parseEther("500"));
      await tokenB.connect(user).approve(router.target, ethers.parseEther("500"));

      await router.connect(user).addLiquidity(tokenA.target, tokenB.target, ethers.parseEther("500"), ethers.parseEther("500"));

      const lp = await pair.balanceOf(user.address);
      expect(lp).to.be.gt(0);
    });

    it("should swap tokens via router", async () => {
      await tokenA.approve(router.target, ethers.parseEther("500"));
      await tokenB.approve(router.target, ethers.parseEther("500"));
      await router.addLiquidity(tokenA.target, tokenB.target, ethers.parseEther("500"), ethers.parseEther("500"));

      const tokenBBefore = await tokenB.balanceOf(owner.address);

      await tokenA.approve(router.target, ethers.parseEther("100"));
      await router.swap(tokenA.target, tokenB.target, ethers.parseEther("100"));

      const tokenBAfter = await tokenB.balanceOf(owner.address);
      expect(tokenBAfter).to.be.gt(tokenBBefore);
    });
  });
});
