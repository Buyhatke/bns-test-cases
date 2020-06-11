const bns = artifacts.require("CoinBNS");
const te = artifacts.require("TradeEngine");
const bnss = artifacts.require("CoinBNSS");
const bnsb = artifacts.require("CoinBNSB");
const truffleAssert = require('truffle-assertions');

contract("bns", function() {

  let token = null;
  let bnstoken = null;
  let bnsstoken = null;
  let bnsbtoken = null;
  let accounts = null;
  let bnsbOwner = null;
  let bnssOwner = null;
  let bnsOwner = null;
  let teOwner = null;
  let nonce = 0;
  let expires = 0;

  before(async function(){
     token = await te.deployed();
     bnstoken = await bns.deployed();
     bnsstoken = await bnss.deployed();
     bnsbtoken = await bnsb.deployed();
     accounts = await web3.eth.getAccounts();
     bnsbOwner = await bnsbtoken.owner.call();
     bnssOwner = await bnsstoken.owner.call();
     bnsOwner = await bnstoken.owner.call();
     teOwner = await token.admin.call();
  });

  it("should be able to setTradeEngineAddress", async function(){

    await bnstoken.setTradeEngineAddress(token.address,{from:bnsOwner});
    let res = await bnstoken.TradeEngineAddress.call();
    assert.equal(res,token.address,"setTradeEngineAddress failed");

    await truffleAssert.reverts(
      bnstoken.setTradeEngineAddress(token.address, {from : accounts[6]}),
      "VM Exception while processing transaction: revert"
    );

  });

  it("should be able to set bnsAddress",async function(){

    await token.setbnsAddress(bnstoken.address,{from:teOwner});
    let res = await token.bnsAddress.call();
    assert.equal(res, bnstoken.address,"setbnsAddress failed");

    await truffleAssert.reverts(
      token.setbnsAddress(bnstoken.address, {from : accounts[6]}),
      "VM Exception while processing transaction: revert"
    );

  });

  it("should be able to set UsdtDecimal", async function(){

    await bnstoken.setUsdtDecimal(8,{from:bnsOwner});
    let res = await bnstoken.usdtDecimal.call();
    assert.equal(res, 8,"setUsdtDecimal failed");

    await truffleAssert.reverts(
      bnstoken.setUsdtDecimal(8,{from : accounts[6]}),
      "VM Exception while processing transaction: revert"
    );

  });

  it("bns should be able to set addresses",async function(){

    await bnstoken.setAddresses(bnsstoken.address, accounts[7], {from : bnsOwner});
    var r1 = await bnstoken.usdt.call();
    var r2 = await bnstoken.feeAccount.call();
    assert.equal(r1, bnsstoken.address, "setAddresses failed");
    assert.equal(r2, accounts[7], "setAddresses failed");

    await truffleAssert.reverts(
      bnstoken.setAddresses(bnsstoken.address, accounts[7], {from : accounts[6]}),
      "VM Exception while processing transaction: revert"
    );
    
  });

  it("should be able to set rateTrxUsdt",async function(){

    await bnstoken.setrateTrxUsdt(100000000,{from:bnsOwner});
    let res = await bnstoken.rateTrxUsdt.call();
    assert.equal(res, 100000000, "setrateTrxUsdt failed");

    await truffleAssert.reverts(
      bnstoken.setrateTrxUsdt(100000000, {from : accounts[6]}),
      "VM Exception while processing transaction: revert"
    );
    
  });

  it("should be able to set FeePercent",async function(){

    await token.setFeePercent(25,{from:teOwner});
    let res = await token.fee.call();
    assert.equal(res,25,"setFeePercent failed");

    await truffleAssert.reverts(
      token.setFeePercent(25,{from : accounts[6]}),
      "VM Exception while processing transaction: revert"
    );
    
  });

  it("should be able to deposit needed funds on TradeEngine", async function(){

    var tokensArray = [bnsbtoken.address, bnsstoken.address, bnstoken.address];
    var rateArray = [100 * 1e8, 1e8, 1e8];

    await token.setRateToken(tokensArray, rateArray, {from : teOwner});

    await truffleAssert.reverts(
      token.setRateToken(tokensArray, rateArray, {from : accounts[6]}),
      "VM Exception while processing transaction: revert"
    );

    await token.setAddresses(bnsstoken.address, accounts[7], {from : teOwner});

    await truffleAssert.reverts(
      token.setAddresses(bnsstoken.address, accounts[7], {from : accounts[6]}),
      "VM Exception while processing transaction: revert"
    );

    await bnsbtoken.mint(accounts[1], 1000*1e8, {from: bnsbOwner});

    await truffleAssert.reverts(
      bnsbtoken.mint(accounts[1], 1000*1e8, {from : accounts[6]}),
      "VM Exception while processing transaction: revert"
    );

    await bnsstoken.transfer(accounts[2], 1000*1e8, {from: bnssOwner});

    let init_token_balance = await token.balanceOf.call(bnsstoken.address, accounts[2]);

    await bnsbtoken.approve(token.address, 1000 * 1e8, {from : accounts[1]});         // allow tradeEngine to spend 
    await token.depositToken(bnsbtoken.address, 1000 * 1e8, {from : accounts[1]});
    await bnsstoken.approve(token.address, 1000 * 1e8, {from : accounts[2]});        // allow tradeEngine to spend 
    await token.depositToken(bnsstoken.address, 1000 * 1e8, {from : accounts[2]});

    let balance_after_deposit = await token.balanceOf.call(bnsstoken.address, accounts[2]);
    assert.equal((balance_after_deposit - init_token_balance), 1000 * 1e8, 'Correct amount of BNSS deposited to contract');

  });

  it("should be able to subscribe to spp and owner should be able to chargeSpp and PARTIAL trade will be done", async function(){

    await bnstoken.subscribeToSpp(accounts[2],10*1e8,2*86400,bnsbtoken.address,bnsstoken.address,{from:accounts[2]}); // deposits are done, now accounts[2] starts a spp

    let bnss_balance_of_subscriber_after_subscribe = await token.balanceOf.call(bnsstoken.address, accounts[2]); // subscriber pays a fee to start spp
    assert.equal(bnss_balance_of_subscriber_after_subscribe,998*1e8,"subscribe fee not taken successfully");

    let res1 = await bnstoken.getRemainingToBeFulfilledBySppID.call(1);
    assert.equal(res1,10*1e8,"getRemainingToBeFulfilled not updated");

    let res2 = await bnstoken.getLatestSppId.call();
    assert.equal(res2,1,"subscribeToSpp unsuccessful");

    let res3 = await bnstoken.isActiveSpp.call(1);
    assert.equal(res3,true,"subscribeToSpp unsuccessful");

    let res4 = await bnstoken.getlistOfSppSubscriptions.call(accounts[2]);
    assert.equal(res4[0],1,"not updated list of spp");

    let res5 = await bnstoken.getTokenStats.call(1);
    assert.equal(res5[0],bnsbtoken.address,"tokenToGet incorrect");
    assert.equal(res5[1],bnsstoken.address,"tokenToGive incorrect");

  });

  it("should be able to chargeSpp", async function(){

    let results = await bnstoken.chargeSpp(1,1e8,10*1e8,500, {from:bnsOwner});

    await truffleAssert.reverts(
      bnstoken.chargeSpp(1,1e8,10*1e8,500, {from : accounts[6]}),
      "VM Exception while processing transaction: revert"
    );

    await truffleAssert.reverts(
      bnstoken.chargeSpp(100,1e8,10*1e8,500, {from : accounts[6]}),
      "VM Exception while processing transaction: revert"
    );

    await truffleAssert.reverts(
      bnstoken.chargeSpp(1,1e8,1000000*1e8,500, {from : accounts[6]}),
      "VM Exception while processing transaction: revert"
    );

    let bnss_balance_of_subscriber_after_chargeSpp = await token.balanceOf.call(bnsstoken.address, accounts[2]); // subscribe pays a fee when an order is placed on their behalf
    assert.equal(bnss_balance_of_subscriber_after_chargeSpp,996*1e8,"chargeSpp fee not taken successfully");

    truffleAssert.eventEmitted(results, 'ChargeSpp', (ev) => {
        nonce = ev.nonce;
        expires = ev.expires;
        return ev.sppID == 1;
    }, "Contract should emit correct event");

  });

  it("should be able to do a PARTIAL trade", async function(){

    await token.trade(bnsbtoken.address, 1e8, bnsstoken.address, 10*1e8, expires, nonce, accounts[2], 0.5*1e8, {from:accounts[1]});

    await truffleAssert.reverts(
      token.trade(bnsbtoken.address, 1e8, bnsstoken.address, 10*1e8, expires, nonce, accounts[2], 1e8, {from:accounts[9]}),  // given wrong trader address in 'from'
      "VM Exception while processing transaction: revert"
    );

    await truffleAssert.reverts(
      token.trade(bnsbtoken.address, 10*1e8, bnsstoken.address, 10*1e8, expires, nonce, accounts[2], 1e8, {from:accounts[1]}), // given wrong amountGet
      "VM Exception while processing transaction: revert"
    );  

    await truffleAssert.reverts(
      token.trade(bnsbtoken.address, 1e8, bnsstoken.address, 10*1e8, expires, nonce, accounts[2], 10*1e8, {from:accounts[1]}), // amount > amountGet
      "VM Exception while processing transaction: revert"
    );  

    let res6 = await bnstoken.getRemainingToBeFulfilledBySppID.call(1);
    assert.equal(res6,5*1e8,"getRemainingToBeFulfilled not updated");


    let bnss_balance_of_trader_after_trade = await token.balanceOf.call(bnsstoken.address, accounts[1]);
    let bnsb_balance_of_trader_after_trade = await token.balanceOf.call(bnsbtoken.address, accounts[1]);
    let bnss_balance_of_subscriber_after_trade = await token.balanceOf.call(bnsstoken.address, accounts[2]);
    let bnsb_balance_of_subscriber_after_trade = await token.balanceOf.call(bnsbtoken.address, accounts[2]);

    assert.equal(bnss_balance_of_trader_after_trade,498750000,"balances after trade are wrong");
    assert.equal(bnsb_balance_of_trader_after_trade,99950000000,"balances after trade are wrong");
    assert.equal(bnss_balance_of_subscriber_after_trade,991*1e8,"balances after trade are wrong");
    assert.equal(bnsb_balance_of_subscriber_after_trade,49875000,"balances after trade are wrong");

  });

  it("should reflect proper current token amounts", async function(){
    let res1 = await bnstoken.getTokenStats.call(1);
    assert.equal(res1[0],bnsbtoken.address,"tokenToGet incorrect");
    assert.equal(res1[1],bnsstoken.address,"tokenToGive incorrect");

    let res2 = await bnstoken.getcurrentTokenAmounts.call(1);
    assert.equal(res2[0],49875000,"incorrect amount upadted");
    assert.equal(res2[1],5*1e8,"incorrect amount updated");
  });

});