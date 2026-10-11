const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FlipBit Smart Contract Tests", function () {
  let flipBit;
  let owner;
  let alice;
  let bob;

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();
    const FlipBitFactory = await ethers.getContractFactory("FlipBit");
    flipBit = await FlipBitFactory.deploy();
    await flipBit.waitForDeployment();
  });

  it("should initialize with 0 total flips", async function () {
    expect(await flipBit.totalFlips()).to.equal(0n);
    expect(await flipBit.getTotalFlips()).to.equal(0n);
  });

  it("1. A flip succeeds and total flip count increases", async function () {
    const tx = await flipBit.connect(alice).flip();
    await tx.wait();

    expect(await flipBit.totalFlips()).to.equal(1n);
    expect(await flipBit.getTotalFlips()).to.equal(1n);
  });

  it("2. The caller's latest result is stored and recorded", async function () {
    // Before flipping
    const [beforeResult, beforeFlipped] = await flipBit.getUserLatestResult(alice.address);
    expect(beforeFlipped).to.be.false;

    // Execute flip
    const tx = await flipBit.connect(alice).flip();
    await tx.wait();

    // After flipping
    const [latestResult, hasFlipped] = await flipBit.getUserLatestResult(alice.address);
    expect(hasFlipped).to.be.true;
    expect(Number(latestResult)).to.be.oneOf([0, 1]);

    const storedDirect = await flipBit.latestResult(alice.address);
    expect(storedDirect).to.equal(latestResult);
  });

  it("3. The correct CoinFlipped event is emitted", async function () {
    await expect(flipBit.connect(alice).flip())
      .to.emit(flipBit, "CoinFlipped")
      .withArgs(alice.address, (res) => Number(res) === 0 || Number(res) === 1, 1n);
  });

  it("4. Multiple flips are counted correctly", async function () {
    await (await flipBit.connect(alice).flip()).wait();
    await (await flipBit.connect(alice).flip()).wait();
    await (await flipBit.connect(alice).flip()).wait();

    expect(await flipBit.getTotalFlips()).to.equal(3n);
  });

  it("5. Different wallets can flip independently and record respective results", async function () {
    // Alice flips
    const tx1 = await flipBit.connect(alice).flip();
    await tx1.wait();

    // Bob flips
    const tx2 = await flipBit.connect(bob).flip();
    await tx2.wait();

    // Total flips is 2
    expect(await flipBit.getTotalFlips()).to.equal(2n);

    // Verify both participants have distinct recorded states
    const [aliceResult, aliceFlipped] = await flipBit.getUserLatestResult(alice.address);
    const [bobResult, bobFlipped] = await flipBit.getUserLatestResult(bob.address);

    expect(aliceFlipped).to.be.true;
    expect(bobFlipped).to.be.true;
    expect(Number(aliceResult)).to.be.oneOf([0, 1]);
    expect(Number(bobResult)).to.be.oneOf([0, 1]);
  });
});
