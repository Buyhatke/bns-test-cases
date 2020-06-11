const te = artifacts.require("TradeEngine");
const bns = artifacts.require("CoinBNS");
const bnss = artifacts.require("CoinBNSS");
const bnsb = artifacts.require("CoinBNSB");
const truffleAssert = require('truffle-assertions');

contract("BNSB test cases", function() {

  let token = null;
  let bnstoken = null;
  let bnsstoken = null;
  let bnsbtoken = null;
  let amountGet = 1e8;
  let amountGive = 8500 * 1e8;
  let currentBlock = 0;
  let expiry = currentBlock + 50000;
  let nonce = Math.floor(Math.random(0,1) * 11122321 + 1);
  let bnsbDecimals = 1e8;
  let bnssDecimals = 1e8;
  let accounts = [];

  before(async function(){
     token = await te.deployed();
     bnstoken = await bns.deployed();
     bnsstoken = await bnss.deployed();
     bnsbtoken = await bnsb.deployed();
     tokenGive = bnsstoken.address;
     tokenGet = bnsbtoken.address;
     currentBlock = await web3.eth.getBlockNumber();
     bnsbDecimals = 1e8;
     bnssDecimals = 1e8;
     amountGet = bnsbDecimals;
     amountGive = 8500 * bnssDecimals;
     accounts = await web3.eth.getAccounts();
  });
  
  it("should return correct total supply", async function() {
    let totSupply = await bnsbtoken.totalSupply.call();
    assert.equal(totSupply, 0, 'total supply is zero to begin with');
  });

  it("should return correct minting status", async function() {
    let mintStatus = await bnsbtoken.mintingFinished.call();
    assert.equal(mintStatus, false, 'status is false now');
  });

  it("should mint tokens", async function() {

    let mintStatus = await bnsbtoken.mintingFinished.call();
    assert.equal(mintStatus, false, 'status is false now');

    await bnsbtoken.mint(accounts[0], 50 * bnsbDecimals, {from: accounts[0]});

    let balance_after_mint = await bnsbtoken.balanceOf.call(accounts[0]);
    assert.equal(balance_after_mint, 50 * bnsbDecimals, 'Minting failed');

    // MInting excess tokens 

    await truffleAssert.reverts(
      bnsbtoken.mint(accounts[0], 21000000 * bnsbDecimals, {from: accounts[0]}),
      "VM Exception while processing transaction: revert"
    ); 

    // Minting from non owner account
    await truffleAssert.reverts(
      bnsbtoken.mint(accounts[0], 21 * bnsbDecimals, {from: accounts[1]}),
      "VM Exception while processing transaction: revert"
    ); 

  });


  it("should burn tokens", async function() {

    await bnsbtoken.burn(10 * bnsbDecimals, {from: accounts[0]});

    let balance_after_burn = await bnsbtoken.balanceOf.call(accounts[0]);
    assert.equal(balance_after_burn, 40 * bnsbDecimals, 'Burning failed');

    // Burning from non owner account
    await truffleAssert.reverts(
      bnsbtoken.burn(10 * bnsbDecimals, {from: accounts[1]}),
      "VM Exception while processing transaction: revert"
    ); 

  });

  it("should be able to stop minting", async function() {

    await bnsbtoken.finishMinting({from: accounts[0]});

    let mintStatus = await bnsbtoken.mintingFinished.call();
    assert.equal(mintStatus, true, 'status is true now');

    await truffleAssert.reverts(
      bnsbtoken.finishMinting({from: accounts[1]}),
      "VM Exception while processing transaction: revert"
    ); 

  });

  it("should be able to resume minting", async function() {

    await bnsbtoken.resumeMinting({from: accounts[0]});

    let mintStatus = await bnsbtoken.mintingFinished.call();
    assert.equal(mintStatus, false, 'status is false now');

    await truffleAssert.reverts(
      bnsbtoken.resumeMinting({from: accounts[1]}),
      "VM Exception while processing transaction: revert"
    ); 

  });


  it("should be able to transfer BNSB", async function() {

    await bnsbtoken.transfer(accounts[1], 1 * bnsbDecimals, {from: accounts[0]});

    let balanceNow = await bnsbtoken.balanceOf.call(accounts[1]);
    assert.equal(balanceNow, 1 * bnsbDecimals, 'Correct amount transferred');

    // Transferring more than balance 

    let balanceBefore = await bnsbtoken.balanceOf.call(accounts[1]);
    await bnsbtoken.transfer(accounts[0], 5 * bnsbDecimals, {from: accounts[1]})
    let balanceAfter = await bnsbtoken.balanceOf.call(accounts[1]);
    
    assert.equal(balanceBefore, 1 * bnsbDecimals, 'Excess transfer didnt fail');
    assert.equal(balanceAfter, 1 * bnsbDecimals, 'Excess transfer didnt fail');

  });

  it("should be able to approve and use transferFrom", async function() {

    await bnsbtoken.approve(accounts[1], 1 * bnsbDecimals, {from: accounts[0]});

    await bnsbtoken.transferFrom(accounts[0], accounts[1], 1 * bnsbDecimals, {from: accounts[1]});

    // Transferring without suff balance left in approval will fail

    await bnsbtoken.transferFrom(accounts[0], accounts[1], 1 * bnsbDecimals, {from: accounts[1]});

    // Trasnferred twice, but balance of only execution should change

    let balanceNow = await bnsbtoken.balanceOf.call(accounts[1]);
    let balanceNowAcc0 = await bnsbtoken.balanceOf.call(accounts[0]);
    assert.equal(balanceNow, 2 * bnsbDecimals, 'Correct amount transferred');
    assert.equal(balanceNowAcc0, 38 * bnsbDecimals, 'Correct amount deducted');

  });

  it("should be able to change admin", async function() {

    var accounts = await web3.eth.getAccounts();
    var adminC = await bnsbtoken.owner.call();
    assert.equal(adminC, accounts[0], 'Admin is wrong');

    var newAdmin = accounts[1];
    await bnsbtoken.changeOwner(newAdmin, {from : accounts[0]});
    await bnsbtoken.becomeOwner({from: newAdmin});

    var adminChanged = await bnsbtoken.owner.call();
    assert.equal(adminChanged, accounts[1], 'Admin set is wrong');

    await bnsbtoken.changeOwner(accounts[0], {from : newAdmin});
    await bnsbtoken.becomeOwner({from: accounts[0]});
    assert.equal(adminC, accounts[0], 'Not able to send back admin');

    await truffleAssert.reverts(
      bnsbtoken.changeOwner(newAdmin, {from : accounts[1]}),
      "VM Exception while processing transaction: revert"
    ); 

    await bnsbtoken.becomeOwner({from: accounts[1]});
    var adminSet = await bnsbtoken.owner.call();
    assert.equal(adminSet, accounts[0], 'Admin is not correct');
    assert.notEqual(adminSet, accounts[1], 'Not able to send back admin');

  });



});


