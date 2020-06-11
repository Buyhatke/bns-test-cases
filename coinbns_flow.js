const te = artifacts.require("TradeEngine");
const bns = artifacts.require("CoinBNS");
const bnss = artifacts.require("CoinBNSS");
const bnsb = artifacts.require("CoinBNSB");
const truffleAssert = require('truffle-assertions');

contract("BNS Flow test cases", function() {

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


  it("should be able to mint BNSB", async function() {

    var accounts = await web3.eth.getAccounts();

    let mintingAddress = accounts[1];
    let mintingResult = await bnsbtoken.mint(mintingAddress, 10 * bnsbDecimals, {from: accounts[0]});

    truffleAssert.eventEmitted(mintingResult, 'Mint', (ev) => {
      return ev.amount == 10 * bnsbDecimals && ev.to == accounts[1];
    }, "Contract should emit correct mint event");

    let balance = await bnsbtoken.balanceOf.call(accounts[1]);

    assert.equal(balance, 10 * bnsbDecimals, 'Correct amount of BNSB minted');

    await truffleAssert.reverts(
      bnsbtoken.mint(mintingAddress, 10 * bnsbDecimals, {from: accounts[2]}),
      "VM Exception while processing transaction: revert"
    ); 

    await truffleAssert.reverts(
      bnsbtoken.mint(mintingAddress, 21000000 * bnsbDecimals, {from: accounts[0]}),
      "VM Exception while processing transaction: revert"
    ); 

  });

  it("should be able to set addresses", async function() {

    var accounts = await web3.eth.getAccounts();

    await bnstoken.setAddresses(bnsstoken.address, accounts[2], {from: accounts[0]});
    let setusdt = await bnstoken.usdt.call();
    let setfee = await bnstoken.feeAccount.call();

    assert.equal(setusdt, bnsstoken.address, 'Correct usdt not set');
    assert.equal(setfee, accounts[2], 'Correct feeAcc not set');

    await truffleAssert.reverts(
      bnstoken.setAddresses(bnsstoken.address, accounts[2], {from: accounts[4]}),
      "VM Exception while processing transaction: revert"
    ); 


    await bnstoken.setUsdtDecimal(8, {from: accounts[0]});
    let setdecimal = await bnstoken.usdtDecimal.call();

    assert.equal(setdecimal, 8, 'Correct decimal not set');

    await truffleAssert.reverts(
      bnstoken.setUsdtDecimal(8, {from: accounts[1]}),
      "VM Exception while processing transaction: revert"
    ); 


    await bnstoken.setMinPeriod(86400, {from: accounts[0]});
    let setperiod = await bnstoken.minPeriod.call();

    assert.equal(setperiod, 86400, 'Correct period not set');

    await truffleAssert.reverts(
      bnstoken.setMinPeriod(86400, {from: accounts[1]}),
      "VM Exception while processing transaction: revert"
    ); 

    await bnstoken.setrateTrxUsdt(1436000, {from: accounts[0]});
    let setrate = await bnstoken.rateTrxUsdt.call();

    assert.equal(setrate, 1436000, 'Correct rate not set');

    await truffleAssert.reverts(
      bnstoken.setrateTrxUsdt(1436000, {from: accounts[1]}),
      "VM Exception while processing transaction: revert"
    ); 


    await bnstoken.setTradeEngineAddress(token.address, {from: accounts[0]});
    let setaddte = await bnstoken.TradeEngineAddress.call();

    assert.equal(setaddte, token.address, 'Correct TE address not set');

    await truffleAssert.reverts(
      bnstoken.setTradeEngineAddress(token.address, {from: accounts[1]}),
      "VM Exception while processing transaction: revert"
    ); 


  });

  it("should be able to transfer BNSB to TE", async function() {

    var accounts = await web3.eth.getAccounts();

    let init_token_balance = await token.balanceOf.call(bnsbtoken.address, accounts[1]);
    await bnsbtoken.approve(token.address, 10 * bnsbDecimals, {from : accounts[1]}); // allow tradeEngine to spend 
    await token.depositToken(bnsbtoken.address, 10 * bnsbDecimals, {from : accounts[1]});

    let balance_after_deposit = await token.balanceOf.call(bnsbtoken.address, accounts[1]);

    assert.equal((balance_after_deposit - init_token_balance), 10 * bnsbDecimals, 'Correct amount of BNSB deposited to contract');

    // SHould fail without proper balance

    await truffleAssert.reverts(
      token.depositToken(bnsbtoken.address, 10 * bnsbDecimals, {from : accounts[3]}),
      "VM Exception while processing transaction: revert"
    ); 

    // SHould fail without approve being called

    await truffleAssert.reverts(
      token.depositToken(bnsbtoken.address, 50 * bnsbDecimals, {from : accounts[0]}),
      "VM Exception while processing transaction: revert"
    ); 

  });

  it("should be able to transfer BNSS to TE", async function() {

    var accounts = await web3.eth.getAccounts();

    let init_token_balance = await token.balanceOf.call(bnsstoken.address, accounts[0]);
    await bnsstoken.approve(token.address, 20000 * bnssDecimals, {from : accounts[0]}); // allow tradeEngine to spend 
    await token.depositToken(bnsstoken.address, 20000 * bnssDecimals, {from : accounts[0]});

    let balance_after_deposit = await token.balanceOf.call(bnsstoken.address, accounts[0]);

    assert.equal((balance_after_deposit - init_token_balance), 20000 * bnssDecimals, 'Correct amount of BNSS deposited to contract');

    // SHould fail without approve being called

    await truffleAssert.reverts(
      token.depositToken(bnsstoken.address, 20000 * bnssDecimals, {from : accounts[3]}),
      "VM Exception while processing transaction: revert"
    ); 

    // SHould fail without approve being called with enough amount

    await truffleAssert.reverts(
      token.depositToken(bnsstoken.address, 400000 * bnssDecimals, {from : accounts[0]}),
      "VM Exception while processing transaction: revert"
    ); 

  });

  it("should be able to set address", async function() {

    var accounts = await web3.eth.getAccounts();
    var setAddress = await token.setAddresses(bnsstoken.address, accounts[2], {from : accounts[0]});

    var setbnsbAdd = await token.usdt.call();
    assert.equal(setbnsbAdd, bnsstoken.address, 'BNSS address setting');

    var feeAccAdd = await token.feeAccount.call();
    assert.equal(feeAccAdd, accounts[2], 'Fee address setting');

    await truffleAssert.reverts(
      token.setAddresses(bnsstoken.address, accounts[2], {from : accounts[1]}),
      "VM Exception while processing transaction: revert"
    ); 

  });

  it("should be able to set BNS address", async function() {

    var accounts = await web3.eth.getAccounts();
    await token.setbnsAddress(bnstoken.address, {from : accounts[0]});

    var setbnsAdd = await token.bnsAddress.call();
    assert.equal(setbnsAdd, bnstoken.address, 'BNS address setting');

    await truffleAssert.reverts(
      token.setbnsAddress(bnstoken.address, {from : accounts[1]}),
      "VM Exception while processing transaction: revert"
    ); 

  });

  it("should be able to set fee percent", async function() {

    var accounts = await web3.eth.getAccounts();
    await token.setFeePercent(50, {from : accounts[0]});

    var setfee = await token.fee.call();
    assert.equal(setfee, 50, 'Fee setting');

    await truffleAssert.reverts(
      token.setFeePercent(50, {from : accounts[1]}),
      "VM Exception while processing transaction: revert"
    ); 

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

    await truffleAssert.reverts(
      token.setRateToken(tokensArray, rateArray, {from : accounts[1]}),
      "VM Exception while processing transaction: revert"
    ); 

  });

  
  it("should be able to subscribe to SPP", async function() {

    var accounts = await web3.eth.getAccounts();

    let balance_before_spp = await token.balanceOf.call(bnsstoken.address, accounts[0]);
    let fee_acc_before_spp = await token.balanceOf.call(bnsstoken.address, accounts[2]);

    await bnstoken.subscribeToSpp(accounts[0], 5 * bnssDecimals, 86400, bnsbtoken.address, bnsstoken.address, {from: accounts[0]});

    let mySPPList = await bnstoken.getlistOfSppSubscriptions.call(accounts[0]);
    assert.equal(mySPPList[0], 1, 'Spp id is wrong');

    let balance_after_spp = await token.balanceOf.call(bnsstoken.address, accounts[0]);
    let fee_acc_after_spp = await token.balanceOf.call(bnsstoken.address, accounts[2]);
    assert.equal((balance_before_spp - balance_after_spp), 2 * bnssDecimals, 'Correct fee deducted');
    assert.equal((fee_acc_after_spp - fee_acc_before_spp), 2 * bnssDecimals, 'Correct fee credited');

    await bnstoken.subscribeToSpp(accounts[0], 5 * bnssDecimals, 86400, bnsbtoken.address, bnsstoken.address, {from: accounts[5]});
    mySPPList = await bnstoken.getlistOfSppSubscriptions.call(accounts[0]);
    assert.equal(mySPPList.length, 1, 'More than 1 SPP created');
    assert.equal(mySPPList[0], 1, 'More than 1 SPP exists');
    

  });


  it("should be able to charge spp - non BNS case", async function() {

    var accounts = await web3.eth.getAccounts();
    let amountGive = 5 * bnssDecimals;
    let rate = 10000 * bnssDecimals;
    let amountGet = parseInt((amountGive/rate) * bnssDecimals);

    let balance_before_charge_spp = await token.balanceOf.call(bnsstoken.address, accounts[0]);

    let receipt = await bnstoken.chargeSpp(1, amountGet, amountGive, 50000, {from: accounts[0]});
    let nonce = 0;
    let expires = 0;

    truffleAssert.eventEmitted(receipt, 'ChargeSpp', (ev) => {
      allEvents = ev;
      nonce = ev.nonce;
      expires = ev.expires
      return 1;
    }, "Reading nonce and expires");

    let gasUsed = receipt.receipt.gasUsed;
    assert.equal(gasUsed, 167985, 'Gas amount changed');

    let feeToBeDeducted = ((2 * 1436000)/1e8) * bnssDecimals;

    let balance_after_charge_spp = await token.balanceOf.call(bnsstoken.address, accounts[0]);

    assert.equal((balance_before_charge_spp - balance_after_charge_spp), feeToBeDeducted, 'Correct fee charged');

    // Lets fulfil the trade with another account

    let bal_bnss_before_trade_poster = await token.balanceOf.call(bnsstoken.address, accounts[0]);
    let bal_bnss_before_trade_trader = await token.balanceOf.call(bnsstoken.address, accounts[1]);
    let bal_bnsb_before_trade_poster = await token.balanceOf.call(bnsbtoken.address, accounts[0]);
    let bal_bnsb_before_trade_trader = await token.balanceOf.call(bnsbtoken.address, accounts[1]);

    await token.trade(bnsbtoken.address, amountGet, bnsstoken.address, amountGive, expires, nonce, accounts[0], amountGet, {from: accounts[1]});

    let bal_bnss_after_trade_poster = await token.balanceOf.call(bnsstoken.address, accounts[0]);
    let bal_bnss_after_trade_trader = await token.balanceOf.call(bnsstoken.address, accounts[1]);
    let bal_bnsb_after_trade_poster = await token.balanceOf.call(bnsbtoken.address, accounts[0]);
    let bal_bnsb_after_trade_trader = await token.balanceOf.call(bnsbtoken.address, accounts[1]);

    let expected_amount_get = 0.995 * amountGet;
    let expected_amount_give = 0.995 * amountGive;

    assert.equal((bal_bnss_before_trade_poster - bal_bnss_after_trade_poster), amountGive, 'Correct trade amount deducted - 1');
    assert.equal((bal_bnsb_before_trade_trader - bal_bnsb_after_trade_trader), amountGet, 'Correct trade amount deducted - 2');

    assert.equal((bal_bnsb_after_trade_poster - bal_bnsb_before_trade_poster), expected_amount_get, 'Correct trade amount credited - 1');
    assert.equal((bal_bnss_after_trade_trader - bal_bnss_before_trade_trader), expected_amount_give, 'Correct trade amount credited - 2');

    // lets check spp specific flags now 


  });


});


