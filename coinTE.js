const te = artifacts.require("TradeEngine");
const bns = artifacts.require("CoinBNS");
const bnss = artifacts.require("CoinBNSS");
const bnsb = artifacts.require("CoinBNSB");
const truffleAssert = require('truffle-assertions');

contract("Trade Engine test cases", function() {

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
  });
  
  it("should be able to change admin", async function() {

    var accounts = await web3.eth.getAccounts();
    var adminC = await token.admin.call();
    assert.equal(adminC, accounts[0], 'Admin is wrong');

    var newAdmin = accounts[1];
    await token.changeAdmin(newAdmin, {from : accounts[0]});
    await token.becomeAdmin({from: newAdmin});

    var adminChanged = await token.admin.call();
    assert.equal(adminChanged, accounts[1], 'Admin set is wrong');

    await token.changeAdmin(accounts[0], {from : newAdmin});
    await token.becomeAdmin({from: accounts[0]});
    assert.equal(adminC, accounts[0], 'Not able to send back admin');

  });

  it("should be able to set lock and unlock", async function() {

    var lockInit = await token.scLock.call();
    assert.equal(lockInit, false, 'Lock is not set to false in beginning');

    var accounts = await web3.eth.getAccounts();

    await token.setLock({from : accounts[0]});
    var lockNow = await token.scLock.call();
    assert.equal(lockNow, true, 'Lock is not set to true');

    await token.setLock({from : accounts[0]});
    var lockNow = await token.scLock.call();
    assert.equal(lockNow, false, 'Lock is not set to false again');

  });

  it("should be able to toggle pay fee in BNS", async function() {

    var accounts = await web3.eth.getAccounts();

    var currentValue = await token.dontTakeFeeInBns.call(accounts[0]);
    assert.equal(currentValue, false, 'Checking init value of fee in BNS');

    await token.toggleTakingBnsAsFee({from : accounts[0]});
    var feeNow = await token.dontTakeFeeInBns.call(accounts[0]);
    assert.equal(feeNow, true, 'Fee in BNS set to true');

    await token.toggleTakingBnsAsFee({from : accounts[0]});
    var feeUndo = await token.dontTakeFeeInBns.call(accounts[0]);
    assert.equal(feeUndo, false, 'Undo fee to default');


  });

  it("should be able to set address", async function() {

    var accounts = await web3.eth.getAccounts();
    var setAddress = await token.setAddresses(bnsstoken.address, accounts[2], {from : accounts[0]});

    var setbnsbAdd = await token.usdt.call();
    assert.equal(setbnsbAdd, bnsstoken.address, 'BNSS address setting');

    var feeAccAdd = await token.feeAccount.call();
    assert.equal(feeAccAdd, accounts[2], 'Fee address setting');

  });

  it("should be able to set BNS address", async function() {

    var accounts = await web3.eth.getAccounts();
    await token.setbnsAddress(bnstoken.address, {from : accounts[0]});

    var setbnsAdd = await token.bnsAddress.call();
    assert.equal(setbnsAdd, bnstoken.address, 'BNS address setting');

  });

  it("should be able to set fee percent", async function() {

    var accounts = await web3.eth.getAccounts();
    await token.setFeePercent(50, {from : accounts[0]});

    var setfee = await token.fee.call();
    assert.equal(setfee, 50, 'Fee setting');

  });

  it("should be able to set tokens rate", async function() {

    var accounts = await web3.eth.getAccounts();
    var tokensArray = [bnsbtoken.address, bnsstoken.address, bnstoken.address];
    var rateArray = [8500 * 1e8, 1e8, 3200000];
    await token.setRateToken(tokensArray, rateArray, {from : accounts[0]});

    for (var i=0; i<tokensArray.length; i++){
      let setRate = await token.rateToken.call(tokensArray[i]);
      assert.equal(setRate, rateArray[i], 'Rate setting');
    }

  });

  it("should be able to deposit ETH", async function() {

    var accounts = await web3.eth.getAccounts();
    let init_token_balance = await token.balanceOf.call("0x0000000000000000000000000000000000000000", accounts[1]);

    await token.deposit({from : accounts[1], value: 100000000});

    let balance_after_deposit = await token.balanceOf.call("0x0000000000000000000000000000000000000000", accounts[1]);

    assert.equal((balance_after_deposit - init_token_balance), 100000000, 'Correct amount of ETH sent to contract');

  });

  it("should be able to withdraw ETH", async function() {

    var accounts = await web3.eth.getAccounts();
    let init_token_balance = await token.balanceOf.call("0x0000000000000000000000000000000000000000", accounts[1]);

    await token.withdraw(100000000, {from : accounts[1]});

    let balance_after_with = await token.balanceOf.call("0x0000000000000000000000000000000000000000", accounts[1]);

    assert.equal((init_token_balance - balance_after_with), 100000000, 'Correct amount of ETH withdrawn to contract');

  });

  it("should be able to deposit BNS token", async function() {

    var accounts = await web3.eth.getAccounts();

    let init_token_balance = await token.balanceOf.call(bnstoken.address, accounts[0]);
    await bnstoken.approve(token.address, 100000000, {from : accounts[0]}); // allow tradeEngine to spend 
    await token.depositToken(bnstoken.address, 100000000, {from : accounts[0]});

    let balance_after_deposit = await token.balanceOf.call(bnstoken.address, accounts[0]);

    assert.equal((balance_after_deposit - init_token_balance), 100000000, 'Correct amount of BNS deposited to contract');

  });

  it("should be able to withdraw BNS token", async function() {

    var accounts = await web3.eth.getAccounts();

    let init_token_balance = await token.balanceOf.call(bnstoken.address, accounts[0]);
    
    await token.withdrawToken(bnstoken.address, 100000000, {from : accounts[0]});

    let balance_after_with = await token.balanceOf.call(bnstoken.address, accounts[0]);

    assert.equal((init_token_balance - balance_after_with), 100000000, 'Correct amount of BNS withdrawn from contract');

  });

  it("should be able to mint BNSB", async function() {

    var accounts = await web3.eth.getAccounts();

    let mintingAddress = accounts[1];
    let mintingResult = await bnsbtoken.mint(mintingAddress, 10 * bnsbDecimals, {from: accounts[0]});

    truffleAssert.eventEmitted(mintingResult, 'Mint', (ev) => {
      return ev.amount == 10 * bnsbDecimals && ev.to == accounts[1];
    }, "Contract should emit correct mint event");

    let balance = await bnsbtoken.balanceOf.call(accounts[1]);

    assert.equal(balance, 10 * bnsbDecimals, 'Correct amount of BNSB minted');

  });

  it("should be able to transfer BNSB to TE", async function() {

    var accounts = await web3.eth.getAccounts();

    let init_token_balance = await token.balanceOf.call(bnsbtoken.address, accounts[1]);
    await bnsbtoken.approve(token.address, 10 * bnsbDecimals, {from : accounts[1]}); // allow tradeEngine to spend 
    await token.depositToken(bnsbtoken.address, 10 * bnsbDecimals, {from : accounts[1]});

    let balance_after_deposit = await token.balanceOf.call(bnsbtoken.address, accounts[1]);

    assert.equal((balance_after_deposit - init_token_balance), 10 * bnsbDecimals, 'Correct amount of BNSB deposited to contract');

  });

  it("should be able to transfer BNSS to TE", async function() {

    var accounts = await web3.eth.getAccounts();

    let init_token_balance = await token.balanceOf.call(bnsstoken.address, accounts[0]);
    await bnsstoken.approve(token.address, 20000 * bnssDecimals, {from : accounts[0]}); // allow tradeEngine to spend 
    await token.depositToken(bnsstoken.address, 20000 * bnssDecimals, {from : accounts[0]});

    let balance_after_deposit = await token.balanceOf.call(bnsstoken.address, accounts[0]);

    assert.equal((balance_after_deposit - init_token_balance), 20000 * bnssDecimals, 'Correct amount of BNSS deposited to contract');

  });

  it("should be able to place order", async function() {

    var accounts = await web3.eth.getAccounts();
    let results = await token.order(tokenGet, amountGet, tokenGive, amountGive, expiry, nonce, {from : accounts[0]});

    truffleAssert.eventEmitted(results, 'Order', (ev) => {
        return ev.tokenGet == tokenGet && ev.tokenGive == tokenGive && ev.amountGet == amountGet && ev.amountGive == amountGive && ev.nonce == nonce;
    }, "Contract should emit correct event");


  });

  it("should be able to check amount filled", async function() {

    var accounts = await web3.eth.getAccounts();
    let resultsBool = await token.amountFilled.call(tokenGet, amountGet, tokenGive, amountGive, expiry, nonce, accounts[0]);

    assert.equal((resultsBool), 0, 'Amount filled so far');

  });

  it("should be able to check trade possible", async function() {

    var accounts = await web3.eth.getAccounts();
    let resultFilled = await token.testTrade(tokenGet, amountGet, tokenGive, amountGive, expiry, nonce, accounts[0], amountGet, accounts[1], {from : accounts[1]});

    assert.equal(resultFilled, true, 'Filled amount check');

  });

  it("should be able to check available volume amount without balance check", async function() {

    var accounts = await web3.eth.getAccounts();
    let resultAvailable = await token.availableVolume.call(tokenGet, amountGet, tokenGive, amountGive, expiry, nonce, accounts[0]);

    assert.equal(resultAvailable, amountGet, 'Available amount check');

  });


  it("should be able to trade", async function() {

    var accounts = await web3.eth.getAccounts();
    let resultsTrade = await token.trade(tokenGet, amountGet, tokenGive, amountGive, expiry, nonce, accounts[0], bnsbDecimals, {from: accounts[1]});

    truffleAssert.eventEmitted(resultsTrade, 'Trade', (ev) => {
      return ev.tokenGet == tokenGet && ev.tokenGive == tokenGive && ev.amountGet == amountGet && ev.amountGive == amountGive;
    }, "Contract should emit correct trade event");

  });

  it("should be able to place order and cancel it", async function() {

    var accounts = await web3.eth.getAccounts();
    nonce = nonce + 1;
    let results = await token.order(tokenGet, amountGet, tokenGive, amountGive, expiry, nonce, {from : accounts[0]});

    truffleAssert.eventEmitted(results, 'Order', (ev) => {
        return ev.tokenGet == tokenGet && ev.tokenGive == tokenGive && ev.amountGet == amountGet && ev.amountGive == amountGive && ev.nonce == nonce;
    }, "Contract should emit correct event");


    let resultsCancel = await token.cancelOrder(tokenGet, amountGet, tokenGive, amountGive, expiry, nonce, {from : accounts[0]});

    truffleAssert.eventEmitted(resultsCancel, 'Cancel', (ev) => {
        return ev.tokenGet == tokenGet && ev.tokenGive == tokenGive && ev.amountGet == amountGet && ev.amountGive == amountGive;
    }, "Contract should emit correct cancel event");

    let resultAvailable = await token.availableVolume.call(tokenGet, amountGet, tokenGive, amountGive, expiry, nonce, accounts[0]);

    assert.equal(resultAvailable, 0, 'Available avail should be 0 after cancellation');

  });


  it("should be able to place order and execute it partially, check available volume , execeute it again and cancel remaining", async function() {

    var accounts = await web3.eth.getAccounts();
    nonce = nonce + 1;
    let results = await token.order(tokenGet, amountGet, tokenGive, amountGive, expiry, nonce, {from : accounts[0]});

    truffleAssert.eventEmitted(results, 'Order', (ev) => {
        return ev.tokenGet == tokenGet && ev.tokenGive == tokenGive && ev.amountGet == amountGet && ev.amountGive == amountGive && ev.nonce == nonce;
    }, "Contract should emit correct event");

    let resultsTrade = await token.trade(tokenGet, amountGet, tokenGive, amountGive, expiry, nonce, accounts[0], amountGet/2, {from: accounts[1]});

    truffleAssert.eventEmitted(resultsTrade, 'Trade', (ev) => {
      return ev.tokenGet == tokenGet && ev.tokenGive == tokenGive && ev.amountGet == amountGet/2 && ev.amountGive == amountGive/2;
    }, "Contract should emit correct trade event");


    let resultAvailable = await token.availableVolume.call(tokenGet, amountGet, tokenGive, amountGive, expiry, nonce, accounts[0]);
    assert.equal(resultAvailable, amountGet/2, 'Available amount check');

    let resultsTrade2 = await token.trade(tokenGet, amountGet, tokenGive, amountGive, expiry, nonce, accounts[0], amountGet/4, {from: accounts[1]});

    truffleAssert.eventEmitted(resultsTrade2, 'Trade', (ev) => {
      return ev.tokenGet == tokenGet && ev.tokenGive == tokenGive && ev.amountGet == amountGet/4 && ev.amountGive == amountGive/4;
    }, "Contract should emit correct trade event");

    let resultAvailable2 = await token.availableVolume.call(tokenGet, amountGet, tokenGive, amountGive, expiry, nonce, accounts[0]);
    assert.equal(resultAvailable2, amountGet/4, 'Available amount second trade check');

    let resultsCancel = await token.cancelOrder(tokenGet, amountGet, tokenGive, amountGive, expiry, nonce, {from : accounts[0]});

    truffleAssert.eventEmitted(resultsCancel, 'Cancel', (ev) => {
        return ev.tokenGet == tokenGet && ev.tokenGive == tokenGive && ev.amountGet == amountGet && ev.amountGive == amountGive && ev.nonce == nonce;
    }, "Contract should emit correct cancel event");

    let resultAvailable3 = await token.availableVolume.call(tokenGet, amountGet, tokenGive, amountGive, expiry, nonce, accounts[0]);

    assert.equal(resultAvailable3, 0, 'Available avail should be 0 after cancellation');

  });


  it("should be able to place order and execute only what is possible", async function() {

    var accounts = await web3.eth.getAccounts();
    nonce = nonce + 1;
    let results = await token.order(tokenGet, amountGet, tokenGive, amountGive, expiry, nonce, {from : accounts[0]});

    truffleAssert.eventEmitted(results, 'Order', (ev) => {
        return ev.tokenGet == tokenGet && ev.tokenGive == tokenGive && ev.amountGet == amountGet && ev.amountGive == amountGive && ev.nonce == nonce;
    }, "Contract should emit correct event");

    let resultAvailableVolGet = await token.availableVolume.call(tokenGet, amountGet, tokenGive, amountGive, expiry, nonce, accounts[0]);
    let resultAvailableVolGive = (amountGive/amountGet) * resultAvailableVolGet;

    let resultsTrade = await token.trade(tokenGet, amountGet, tokenGive, amountGive, expiry, nonce, accounts[0], resultAvailableVolGet, {from: accounts[1]});
    let emittedVolGet = 0;
    let emittedVolGive = 0;
    truffleAssert.eventEmitted(resultsTrade, 'Trade', (ev) => {
      emittedVolGet = ev.amountGet;
      emittedVolGive = ev.amountGive;
      return ev.tokenGet == tokenGet && ev.tokenGive == tokenGive;
    }, "Contract should emit correct trade execution event");

    assert.equal(emittedVolGet.toNumber(), Number(resultAvailableVolGet), 'VolGet should match');
    assert.equal(emittedVolGive.toNumber(), Number(resultAvailableVolGive), 'VolGive should match');

    let resultAvailable = await token.availableVolume.call(tokenGet, amountGet, tokenGive, amountGive, expiry, nonce, accounts[0]);
    assert.equal(resultAvailable, 0, 'Available amount should be zero now');

  });


  it("should be able to add more BNSS to account", async function() {

    var accounts = await web3.eth.getAccounts();

    let init_token_balance = await token.balanceOf.call(bnsstoken.address, accounts[0]);
    await bnsstoken.approve(token.address, 50000 * bnssDecimals, {from : accounts[0]}); // allow tradeEngine to spend 
    await token.depositToken(bnsstoken.address, 50000 * bnssDecimals, {from : accounts[0]});

    let balance_after_deposit = await token.balanceOf.call(bnsstoken.address, accounts[0]);

    assert.equal((balance_after_deposit - init_token_balance), 50000 * bnssDecimals, 'Correct amount of BNSS deposited to contract');

  });

  it("should deduct correct fee without BNS", async function() {

    var accounts = await web3.eth.getAccounts();
    nonce = nonce + 1;
    amountGive = 10000 * bnssDecimals; // changed BTC rate for simplicity of calculations
    let results = await token.order(tokenGet, amountGet, tokenGive, amountGive, expiry, nonce, {from : accounts[0]});

    truffleAssert.eventEmitted(results, 'Order', (ev) => {
        return ev.tokenGet == tokenGet && ev.tokenGive == tokenGive && ev.amountGet == amountGet && ev.amountGive == amountGive && ev.nonce == nonce;
    }, "Contract should emit correct event");

    let bnsb_balance_poster = await token.balanceOf.call(bnsbtoken.address, accounts[0]); // BTC available before trade
    let bnss_balance_trader = await token.balanceOf.call(bnsstoken.address, accounts[1]); // USDT available before trade

    let resultAvailableVolGet = await token.availableVolume.call(tokenGet, amountGet, tokenGive, amountGive, expiry, nonce, accounts[0]);
    let resultAvailableVolGive = (amountGive/amountGet) * resultAvailableVolGet;

    let token_actual_get = 0.995 * resultAvailableVolGet;
    let token_actual_give = 0.995 * resultAvailableVolGive;

    let resultsTrade = await token.trade(tokenGet, amountGet, tokenGive, amountGive, expiry, nonce, accounts[0], resultAvailableVolGet, {from: accounts[1]});
    let emittedVolGet = 0;
    let emittedVolGive = 0;
    truffleAssert.eventEmitted(resultsTrade, 'Trade', (ev) => {
      emittedVolGet = ev.amountGet;
      emittedVolGive = ev.amountGive;
      return ev.tokenGet == tokenGet && ev.tokenGive == tokenGive;
    }, "Contract should emit correct trade execution event");

    assert.equal(emittedVolGet.toNumber(), Number(resultAvailableVolGet), 'VolGet should match');
    assert.equal(emittedVolGive.toNumber(), Number(resultAvailableVolGive), 'VolGive should match');

    let bnsb_balance_poster2 = await token.balanceOf.call(bnsbtoken.address, accounts[0]); // BTC available after trade
    let bnss_balance_trader2 = await token.balanceOf.call(bnsstoken.address, accounts[1]); // USDT available after trade

    assert.equal((bnsb_balance_poster2 - bnsb_balance_poster), token_actual_get, 'VolGet credited should match');
    assert.equal((bnss_balance_trader2 - bnss_balance_trader), token_actual_give, 'VolGive credited should match');

    let resultAvailable = await token.availableVolume.call(tokenGet, amountGet, tokenGive, amountGive, expiry, nonce, accounts[0]);
    assert.equal(resultAvailable, 0, 'Available amount should be zero now');

  });


  it("should deduct correct fee with BNS in account and dontPayfromBNS set", async function() { 

    var accounts = await web3.eth.getAccounts();

    await bnstoken.approve(token.address, 2000000 * 1e8, {from : accounts[0]}); // allow tradeEngine to spend 
    await token.depositToken(bnstoken.address, 2000000 * 1e8, {from : accounts[0]});

    await bnstoken.transfer(accounts[1], 2000000 * 1e8, {from: accounts[0]}); // send funds to that account
    await bnstoken.approve(token.address, 2000000 * 1e8, {from : accounts[1]}); // allow tradeEngine to spend 
    await token.depositToken(bnstoken.address, 2000000 * 1e8, {from : accounts[1]});

    await token.toggleTakingBnsAsFee({from : accounts[0]});
    var feeNow = await token.dontTakeFeeInBns.call(accounts[0]);
    assert.equal(feeNow, true, 'Dont pay fee in BNS set to true');

    await token.toggleTakingBnsAsFee({from : accounts[1]});
    var feeNow = await token.dontTakeFeeInBns.call(accounts[1]);
    assert.equal(feeNow, true, 'Dont pay fee in BNS set to true');

    nonce = nonce + 1;
    amountGive = 10000 * bnssDecimals; // changed BTC rate for simplicity of calculations
    let results = await token.order(tokenGet, amountGet, tokenGive, amountGive, expiry, nonce, {from : accounts[0]});

    truffleAssert.eventEmitted(results, 'Order', (ev) => {
        return ev.tokenGet == tokenGet && ev.tokenGive == tokenGive && ev.amountGet == amountGet && ev.amountGive == amountGive && ev.nonce == nonce;
    }, "Contract should emit correct event");

    let bnsb_balance_poster = await token.balanceOf.call(bnsbtoken.address, accounts[0]); // BTC available before trade
    let bnss_balance_trader = await token.balanceOf.call(bnsstoken.address, accounts[1]); // USDT available before trade

    let resultAvailableVolGet = await token.availableVolume.call(tokenGet, amountGet, tokenGive, amountGive, expiry, nonce, accounts[0]);
    let resultAvailableVolGive = (amountGive/amountGet) * resultAvailableVolGet;

    let token_actual_get = 0.995 * resultAvailableVolGet;
    let token_actual_give = 0.995 * resultAvailableVolGive;

    let resultsTrade = await token.trade(tokenGet, amountGet, tokenGive, amountGive, expiry, nonce, accounts[0], resultAvailableVolGet, {from: accounts[1]});
    let emittedVolGet = 0;
    let emittedVolGive = 0;
    truffleAssert.eventEmitted(resultsTrade, 'Trade', (ev) => {
      emittedVolGet = ev.amountGet;
      emittedVolGive = ev.amountGive;
      return ev.tokenGet == tokenGet && ev.tokenGive == tokenGive;
    }, "Contract should emit correct trade execution event");

    assert.equal(emittedVolGet.toNumber(), Number(resultAvailableVolGet), 'VolGet should match');
    assert.equal(emittedVolGive.toNumber(), Number(resultAvailableVolGive), 'VolGive should match');

    let bnsb_balance_poster2 = await token.balanceOf.call(bnsbtoken.address, accounts[0]); // BTC available after trade
    let bnss_balance_trader2 = await token.balanceOf.call(bnsstoken.address, accounts[1]); // USDT available after trade

    assert.equal((bnsb_balance_poster2 - bnsb_balance_poster), token_actual_get, 'VolGet credited should match');
    assert.equal((bnss_balance_trader2 - bnss_balance_trader), token_actual_give, 'VolGive credited should match');

    let resultAvailable = await token.availableVolume.call(tokenGet, amountGet, tokenGive, amountGive, expiry, nonce, accounts[0]);
    assert.equal(resultAvailable, 0, 'Available amount should be zero now');

  });


  it("should deduct correct fee in terms of BNS token", async function() { 

    var accounts = await web3.eth.getAccounts();

    await token.toggleTakingBnsAsFee({from : accounts[0]});
    var feeNow = await token.dontTakeFeeInBns.call(accounts[0]);
    assert.equal(feeNow, false, 'Dont pay fee in BNS set to false'); // fee should be paid in BNS now

    await token.toggleTakingBnsAsFee({from : accounts[1]});
    var feeNow = await token.dontTakeFeeInBns.call(accounts[1]);
    assert.equal(feeNow, false, 'Dont pay fee in BNS set to false'); // fee should be paid in BNS now

    let setRateBNS = await token.rateToken.call(bnstoken.address);
    let setRateBNSS = await token.rateToken.call(bnsstoken.address);
    let setRateBNSB = await token.rateToken.call(bnsbtoken.address);

    assert.equal(setRateBNS, 32 * 1e5, 'rate of BNS check');
    assert.equal(setRateBNSS, 1e8, 'rate of BNSS check');
    assert.equal(setRateBNSB, 8500 * 1e8, 'rate of BNSB check');


    nonce = nonce + 1;
    amountGive = 10000 * bnssDecimals; // changed BTC rate for simplicity of calculations
    amountGet = bnsbDecimals;
    let results = await token.order(tokenGet, amountGet, tokenGive, amountGive, expiry, nonce, {from : accounts[0]});

    truffleAssert.eventEmitted(results, 'Order', (ev) => {
        return ev.tokenGet == tokenGet && ev.tokenGive == tokenGive && ev.amountGet == amountGet && ev.amountGive == amountGive && ev.nonce == nonce;
    }, "Contract should emit correct event");

    let bnsb_balance_poster = await token.balanceOf.call(bnsbtoken.address, accounts[0]); // BTC available before trade
    let bnss_balance_trader = await token.balanceOf.call(bnsstoken.address, accounts[1]); // USDT available before trade

    let bns_balance_poster = await token.balanceOf.call(bnstoken.address, accounts[0]); // BNS available before trade
    let bns_balance_trader = await token.balanceOf.call(bnstoken.address, accounts[1]); // BNS available before trade
    let bns_balance_fee = await token.balanceOf.call(bnstoken.address, accounts[2]); // BNS available before fee account

    let resultAvailableVolGet = await token.availableVolume.call(tokenGet, amountGet, tokenGive, amountGive, expiry, nonce, accounts[0]);
    let resultAvailableVolGive = (amountGive/amountGet) * resultAvailableVolGet;

    let token_actual_get = 1 * resultAvailableVolGet; // full amount BTC should be credited, fee in BNS
    let token_actual_give = 1 * resultAvailableVolGive; // full amount USDT should be credited, fee in BNS

    let fee_in_bns_get =  Math.floor(0.005 * 0.75 * (token_actual_get) * 1e8) * 8500 * 1e8 / (3200000 * bnsbDecimals);
    let fee_in_bns_give = Math.floor(0.005 * 0.75 * (token_actual_give) * 1e8) * 1e8 / (3200000 * bnssDecimals);

    let resultsTrade = await token.trade(tokenGet, amountGet, tokenGive, amountGive, expiry, nonce, accounts[0], resultAvailableVolGet, {from: accounts[1]});
    let emittedVolGet = 0;
    let emittedVolGive = 0;
    truffleAssert.eventEmitted(resultsTrade, 'Trade', (ev) => {
      emittedVolGet = ev.amountGet;
      emittedVolGive = ev.amountGive;
      return ev.tokenGet == tokenGet && ev.tokenGive == tokenGive;
    }, "Contract should emit correct trade execution event");

    assert.equal(emittedVolGet.toNumber(), Number(resultAvailableVolGet), 'VolGet should match');
    assert.equal(emittedVolGive.toNumber(), Number(resultAvailableVolGive), 'VolGive should match');

    let bnsb_balance_poster2 = await token.balanceOf.call(bnsbtoken.address, accounts[0]); // BTC available after trade
    let bnss_balance_trader2 = await token.balanceOf.call(bnsstoken.address, accounts[1]); // USDT available after trade

    let bns_balance_poster2 = await token.balanceOf.call(bnstoken.address, accounts[0]); // BNS available after trade
    let bns_balance_trader2 = await token.balanceOf.call(bnstoken.address, accounts[1]); // BNS available after trade
    let bns_balance_fee2 = await token.balanceOf.call(bnstoken.address, accounts[2]); // BNS available after trade fee account

    assert.equal((bnsb_balance_poster2 - bnsb_balance_poster), token_actual_get, 'VolGet credited should match');
    assert.equal((bnss_balance_trader2 - bnss_balance_trader), token_actual_give, 'VolGive credited should match');

    assert.equal((bns_balance_trader - bns_balance_trader2), parseInt(fee_in_bns_give), 'Fee in BNS  deducted should match - trader');
    assert.equal((bns_balance_poster - bns_balance_poster2), parseInt(fee_in_bns_get), 'Fee in BNS deducted should match - poster');
    assert.equal((bns_balance_fee2 - bns_balance_fee), (fee_in_bns_give + fee_in_bns_get), 'Fee in BNS should be credited to fee account');

    let resultAvailable = await token.availableVolume.call(tokenGet, amountGet, tokenGive, amountGive, expiry, nonce, accounts[0]);
    assert.equal(resultAvailable, 0, 'Available amount should be zero now');

  });


});


