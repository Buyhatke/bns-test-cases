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

  before(async function(){
     token = await te.deployed();
     bnstoken = await bns.deployed();
     bnsstoken = await bnss.deployed();
     bnsbtoken = await bnsb.deployed();
  });

  it("should be able to subscribe to spp and owner should be able to chargeSpp with paying the fee only with BNS everywhere", async function(){

    var token = await te.deployed();           
    var bnstoken = await bns.deployed();
    var bnsstoken = await bnss.deployed();
    var bnsbtoken = await bnsb.deployed();

    var accounts = await web3.eth.getAccounts();
    var bnsbOwner = await bnsbtoken.owner.call();
    var bnssOwner = await bnsstoken.owner.call();
    var bnsOwner = await bnstoken.owner.call();
    var teOwner = await token.admin.call();

    var tokensArray = [bnsbtoken.address, bnsstoken.address, bnstoken.address];
    var rateArray = [100 * 1e8, 1e8, 1e8];

    await bnstoken.setTradeEngineAddress(token.address,{from:bnsOwner});
    await token.setbnsAddress(bnstoken.address,{from:teOwner});
    await bnstoken.setUsdtDecimal(8,{from:bnsOwner});
    await bnstoken.setAddresses(bnsstoken.address, accounts[7], {from : bnsOwner});
    await bnstoken.setrateTrxUsdt(100000000,{from:bnsOwner});

    var bnsAddressOnTE = await token.bnsAddress.call();
    var teAddressOnBNS = await bnstoken.TradeEngineAddress.call();

    assert.equal(bnstoken.address,bnsAddressOnTE,"set address unsuccessful");
    assert.equal(token.address,teAddressOnBNS,"set address unsuccessful");

    await token.setFeePercent(25,{from:teOwner});
    await token.setRateToken(tokensArray, rateArray, {from : teOwner});
    await token.setAddresses(bnsbtoken.address, accounts[7], {from : teOwner});

    await bnsbtoken.mint(accounts[1], 1000*1e8, {from: bnsbOwner});
    await bnsstoken.transfer(accounts[2], 1000*1e8, {from: bnssOwner});
    await bnstoken.transfer(accounts[1], 1000*1e8, {from: bnsOwner});
    await bnstoken.transfer(accounts[2], 1000*1e8, {from: bnsOwner})

    let init_token_balance = await token.balanceOf.call(bnsstoken.address, accounts[2]);

    await bnsbtoken.approve(token.address, 1000 * 1e8, {from : accounts[1]});         // allow tradeEngine to spend 
    await token.depositToken(bnsbtoken.address, 1000 * 1e8, {from : accounts[1]});
    await bnsstoken.approve(token.address, 1000 * 1e8, {from : accounts[2]});        // allow tradeEngine to spend 
    await token.depositToken(bnsstoken.address, 1000 * 1e8, {from : accounts[2]});
    await bnstoken.approve(token.address, 1000 * 1e8, {from : accounts[1]});
    await token.depositToken(bnstoken.address, 1000*1e8, {from : accounts[1]});
    await bnstoken.approve(token.address, 1000 * 1e8, {from : accounts[2]});
    await token.depositToken(bnstoken.address, 1000*1e8, {from : accounts[2]});

    let balance_after_deposit = await token.balanceOf.call(bnsstoken.address, accounts[2]);
    assert.equal((balance_after_deposit - init_token_balance), 1000 * 1e8, 'Correct amount of BNSB deposited to contract');

    let r = await token.balanceOf.call(bnstoken.address, accounts[2]);
    assert.equal(r,1000*1e8,"bns balance incorrect");
    let r1 = await token.balanceOf.call(bnsstoken.address, accounts[2]);
    assert.equal(r,1000*1e8,"bnss balance incorrect");

    await bnstoken.subscribeToSpp(accounts[2],10*1e8,2*86400,bnsbtoken.address,bnsstoken.address,{from:accounts[2]}); // deposits are done, now accounts[2] starts a spp

    let bnss_balance_of_subscriber_after_subscribe = await token.balanceOf.call(bnsstoken.address, accounts[2]); // subscriber pays a fee to start spp
    assert.equal(bnss_balance_of_subscriber_after_subscribe,1000*1e8,"subscribe fee not taken successfully");

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

    let r2 = await token.balanceOf.call(bnsstoken.address, accounts[2]);
    assert.equal(r,1000*1e8,"bnss balance incorrect");

    let results = await bnstoken.chargeSpp(1,1e8,10*1e8,500, {from:bnsOwner});
    let bnss_balance_of_subscriber_after_chargeSpp = await token.balanceOf.call(bnsstoken.address, accounts[2]); // subscribe pays a fee when an order is placed on their behalf
    assert.equal(bnss_balance_of_subscriber_after_chargeSpp,1000*1e8,"chargeSpp fee not taken successfully");

    let nonce = 0;
    let expires = 0;

    truffleAssert.eventEmitted(results, 'ChargeSpp', (ev) => {
        nonce = ev.nonce;
        expires = ev.expires;
        return ev.sppID == 1;
    }, "Contract should emit correct event");

    await token.trade(bnsbtoken.address, 1e8, bnsstoken.address, 10*1e8, expires, nonce, accounts[2], 1e8, {from:accounts[1]});

    let res6 = await bnstoken.getRemainingToBeFulfilledBySppID.call(1);
    assert.equal(res6,10*1e8,"getRemainingToBeFulfilled not updated");


    let bnss_balance_of_trader_after_trade = await token.balanceOf.call(bnsstoken.address, accounts[1]);
    let bnsb_balance_of_trader_after_trade = await token.balanceOf.call(bnsbtoken.address, accounts[1]);
    let bnss_balance_of_subscriber_after_trade = await token.balanceOf.call(bnsstoken.address, accounts[2]);
    let bnsb_balance_of_subscriber_after_trade = await token.balanceOf.call(bnsbtoken.address, accounts[2]);

    assert.equal(bnss_balance_of_trader_after_trade,1000000000,"balances after trade are wrong");
    assert.equal(bnsb_balance_of_trader_after_trade,99900000000,"balances after trade are wrong");
    assert.equal(bnss_balance_of_subscriber_after_trade,990*1e8,"balances after trade are wrong");
    assert.equal(bnsb_balance_of_subscriber_after_trade,100000000,"balances after trade are wrong");

  });

  it("should reflect proper current token amounts", async function(){
    let res1 = await bnstoken.getTokenStats.call(1);
    assert.equal(res1[0],bnsbtoken.address,"tokenToGet incorrect");
    assert.equal(res1[1],bnsstoken.address,"tokenToGive incorrect");

    let res2 = await bnstoken.getcurrentTokenAmounts.call(1);
    assert.equal(res2[0],100000000,"incorrect amount updated");
    assert.equal(res2[1],1000000000,"incorrect amount updated");
  });

});