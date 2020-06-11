const te = artifacts.require("TradeEngine");
const bns = artifacts.require("CoinBNS");
const bnss = artifacts.require("CoinBNSS");
const bnsb = artifacts.require("CoinBNSB");
const truffleAssert = require('truffle-assertions');

contract("BNSS test cases", function() {

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
    let totSupply = await bnsstoken.totalSupply.call();
    assert.equal(totSupply, 160000000000000000, 'total supply is not correct');
  });


  it("should be able to transfer BNSS", async function() {

    await bnsstoken.transfer(accounts[1], 1 * bnssDecimals, {from: accounts[0]});

    // Send from an account with no balance should fail
    await bnsstoken.transfer(accounts[1], 20 * bnssDecimals, {from: accounts[2]});

    // accounts[1] got funds from 2 addresses, but only one should reflect
    let balanceNow = await bnsstoken.balanceOf.call(accounts[1]);
    assert.equal(balanceNow, 1 * bnssDecimals, 'Correct amount transferred');


  });

  it("should be able to approve and use transferFrom", async function() {

    let balanceBeforeAcc0 = await bnsstoken.balanceOf.call(accounts[0]);
    await bnsstoken.approve(accounts[1], 1 * bnssDecimals, {from: accounts[0]});

    await bnsstoken.transferFrom(accounts[0], accounts[1], 1 * bnssDecimals, {from: accounts[1]});

    // Transferring without suff balance left in approval will fail

    await bnsstoken.transferFrom(accounts[0], accounts[1], 1 * bnssDecimals, {from: accounts[1]});

    // Trasnferred twice, but balance of only execution should change
    let balanceNow = await bnsstoken.balanceOf.call(accounts[1]);
    let balanceNowAcc0 = await bnsstoken.balanceOf.call(accounts[0]);
    assert.equal(balanceNow, 2 * bnssDecimals, 'Correct amount transferred');
    assert.equal((balanceBeforeAcc0 - balanceNowAcc0), 1 * bnssDecimals, 'Correct amount deducted');    

  });

  it("should be able to change admin", async function() {

    var accounts = await web3.eth.getAccounts();
    var adminC = await bnsstoken.owner.call();
    assert.equal(adminC, accounts[0], 'Admin is wrong');

    var newAdmin = accounts[1];
    await bnsstoken.changeOwner(newAdmin, {from : accounts[0]});
    await bnsstoken.becomeOwner({from: newAdmin});

    var adminChanged = await bnsstoken.owner.call();
    assert.equal(adminChanged, accounts[1], 'Admin set is wrong');

    await bnsstoken.changeOwner(accounts[0], {from : newAdmin});
    await bnsstoken.becomeOwner({from: accounts[0]});
    assert.equal(adminC, accounts[0], 'Not able to send back admin');

    await truffleAssert.reverts(
      bnsstoken.changeOwner(newAdmin, {from : accounts[1]}),
      "VM Exception while processing transaction: revert"
    ); 

    await bnsstoken.becomeOwner({from: accounts[1]});
    var adminSet = await bnsstoken.owner.call();
    assert.equal(adminSet, accounts[0], 'Admin is not correct');
    assert.notEqual(adminSet, accounts[1], 'Not able to send back admin');

  });



});


