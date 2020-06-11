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

  it("should return correct total supply", async function() {
      var totSupply = await bnstoken.totalSupply.call();
      assert.equal(totSupply, 250000000000000000, 'total supply is wrong');
  });

  it("should be able to set lock to true", async function() {

    var lockInit = await bnstoken.scLock.call();
    assert.equal(lockInit, false, 'Lock is not set to false in beginning');

    var accounts = await web3.eth.getAccounts();

    await bnstoken.setLock({from : accounts[0]});
    var lockNow = await bnstoken.scLock.call();
    assert.equal(lockNow, true, 'Lock is not set to true');

    await bnstoken.setLock({from : accounts[0]});
    var lockNow = await bnstoken.scLock.call();
    assert.equal(lockNow, false, 'Lock is not set to false again');  

    await truffleAssert.reverts(
      token.setLock({from : accounts[1]}),
      "VM Exception while processing transaction: revert"
    ); 

  });

  it("should be able to change the owner", async function(){

    var accounts = await web3.eth.getAccounts();

    var ownerCurr = await bnstoken.owner.call();
    assert.equal(ownerCurr, accounts[0], 'Owner is wrong');

    var newOwner = accounts[1];
    await bnstoken.changeOwner(newOwner, {from : accounts[0]});
    await bnstoken.becomeOwner({from: newOwner});
    var ownerChanged = await bnstoken.owner.call();
    assert.equal(ownerChanged, accounts[1], 'Owner set is wrong');

    await bnstoken.changeOwner(accounts[0],{from : ownerChanged});
    await bnstoken.becomeOwner({from: accounts[0]});
    var o = await bnstoken.owner.call();
    assert.equal(accounts[0],o,"Owner not set back");

    await truffleAssert.reverts(
      bnstoken.changeOwner(accounts[5],{from : accounts[1]}),
      "VM Exception while processing transaction: revert"
    );

  });
  
  it("should be able to transfer BNS to an address", async function(){

    var accounts = await web3.eth.getAccounts();

    var ownerCurr = await bnstoken.owner.call();
    assert.equal(ownerCurr, accounts[0], 'Owner is wrong');

    let results = await bnstoken.transfer(accounts[1], 1000000000, {from : ownerCurr});

    truffleAssert.eventEmitted(results, 'Transfer', (ev) => {
        return ev.from == ownerCurr && ev.to == accounts[1] && ev.value == 1000000000;
    }, "Contract should emit correct event");

    var balance = await bnstoken.balanceOf.call(accounts[1]);
    assert.equal(balance, 1000000000, "Funds not transferred");

    let res = bnstoken.transfer(accounts[1], 1000000000, {from : accounts[9]}); // negative case
    assert.notEqual(res,true,"should fail");

  });

  it("should be able to mint and burn properly", async function(){

    var ownerCurr = await bnstoken.owner.call();

    var accounts = await web3.eth.getAccounts();

    let results = await bnstoken.burn(1000000000, {from : ownerCurr});

    truffleAssert.eventEmitted(results, 'Transfer', (ev) => {
        return ev.from == ownerCurr && ev.to == '0x0000000000000000000000000000000000000000' && ev.value == 1000000000;
    }, "Contract should emit correct event");

    var balance = await bnstoken.balanceOf.call(ownerCurr);
    assert.equal(balance, (250000000000000000-2000000000), "amount not burnt");
    var totSupply = await bnstoken.totalSupply.call();
    assert.equal(totSupply,(250000000000000000-1000000000),"not burnt succesfully");

    let results1 = await bnstoken.mint("hash", accounts[1], 1000000000, {from : ownerCurr});

    truffleAssert.eventEmitted(results1, 'Mint', (ev) => {
        return ev.hash == "hash" && ev.account == accounts[1] && ev.value == 1000000000;
    }, "Contract should emit correct event");

    var balance = await bnstoken.balanceOf.call(accounts[1]);
    assert.equal(balance, 2000000000, "amount not minted");
    var totSupply = await bnstoken.totalSupply.call();
    assert.equal(totSupply,250000000000000000,"not minted succesfully");

    await truffleAssert.reverts(
      bnstoken.mint("hash", accounts[1], 1000000000, {from : accounts[6]}),
      "VM Exception while processing transaction: revert"
    );

    await truffleAssert.reverts(
      bnstoken.burn(1000000000, {from : accounts[6]}),
      "VM Exception while processing transaction: revert"
    );    

  });

  it("owner should be able to make multiple issuances and users should not be able to spend frozen tokens", async function(){

    var ownerCurr = await bnstoken.owner.call();

    var accounts = await web3.eth.getAccounts();

    await bnstoken.issueMulti([accounts[2],accounts[3]],[1000000000,1000000000], 10, 1, {from : ownerCurr});
    var balance1 = await bnstoken.balanceOf.call(accounts[2]);
    var balance2 = await bnstoken.balanceOf.call(accounts[3]);
    assert.equal(balance1,1000000000,"issue unsuccessful");
    assert.equal(balance2,1000000000,"issue unsuccessful");
    var frozen_balance1 = await bnstoken.frozenBalanceOf(accounts[2]);
    assert(frozen_balance1,1000000000,"issue unsuccessful");

    let res = await bnstoken.transferFrom(accounts[2],accounts[4],500000000);
    assert(res,false,"user should not be able to spend frozen tokens");

    await truffleAssert.reverts(
      bnstoken.issueMulti([accounts[2],accounts[3]],[1000000000,1000000000], 10, 1, {from : accounts[4]}), // owner not calling
      "VM Exception while processing transaction: revert"
    );

    await truffleAssert.reverts(
      bnstoken.issueMulti([accounts[2],accounts[3]],[1000000000], 10, 1, {from : accounts[4]}), // array size different
      "VM Exception while processing transaction: revert"
    );    

  });

  it("should be able to deposit ETH", async function() {

    var accounts = await web3.eth.getAccounts();
    // console.log(accounts);
    let init_token_balance = await bnstoken.tokenBalanceOf.call("0x0000000000000000000000000000000000000000", accounts[0]);
    // console.log(init_token_balance);
    let results = await bnstoken.deposit({from : accounts[0], value: 1});

    truffleAssert.eventEmitted(results, 'Deposit', (ev) => {
        return ev.token == "0x0000000000000000000000000000000000000000" && ev.user == accounts[0] && ev.amount == 1 && ev.balance == 1 ;
    }, "Contract should emit correct event");


    let balance_after_deposit = await bnstoken.tokenBalanceOf.call("0x0000000000000000000000000000000000000000", accounts[0]);

    assert.equal((balance_after_deposit - init_token_balance), 1, 'Correct amount of ETH sent to contract'); 

  });

  it("should be able to withdraw ETH", async function() {

    var accounts = await web3.eth.getAccounts();
    let init_token_balance = await bnstoken.tokenBalanceOf.call("0x0000000000000000000000000000000000000000", accounts[0]);

    let results = await bnstoken.withdraw(1, {from : accounts[0]});

    truffleAssert.eventEmitted(results, 'Withdraw', (ev) => {
        return ev.token == "0x0000000000000000000000000000000000000000" && ev.user == accounts[0] && ev.amount == 1 && ev.balance == 0 ;
    }, "Contract should emit correct event");

    let balance_after_with = await bnstoken.tokenBalanceOf.call("0x0000000000000000000000000000000000000000", accounts[0]);

    assert.equal((init_token_balance - balance_after_with), 1, 'Correct amount of ETH withdrawn to contract');

  });

  it("should be able to deposit BNSS token", async function() {

    var accounts = await web3.eth.getAccounts();
    let bnssOwner = await bnsstoken.owner.call();

    let init_token_balance = await bnstoken.tokenBalanceOf.call(bnsstoken.address, bnssOwner);
    assert.equal(init_token_balance,0,"initial BNSS balance should be zero");

    await bnsstoken.approve(bnstoken.address, 100000000, {from : accounts[0]});                     // allow CoinBNS to spend BNSS
    await bnstoken.depositToken(bnsstoken.address, 100000000, {from : accounts[0]});

    let balance_after_deposit = await bnstoken.tokenBalanceOf.call(bnsstoken.address, accounts[0]);

    assert.equal((balance_after_deposit - init_token_balance), 100000000, 'Correct amount of BNS deposited to contract');

    await truffleAssert.reverts(
      bnstoken.depositToken("0x0000000000000000000000000000000000000000", 100000000, {from : accounts[0]}),
      "VM Exception while processing transaction: revert"
    );

    await truffleAssert.reverts(
      bnstoken.depositToken(bnsstoken.address, 100000000, {from : accounts[4]}),
      "VM Exception while processing transaction: revert"
    ); 

  });

  it("should be able to withdraw BNSS token", async function() {

    var accounts = await web3.eth.getAccounts();
    let bnssOwner = await bnsstoken.owner.call();

    let init_token_balance = await bnstoken.tokenBalanceOf.call(bnsstoken.address, bnssOwner);
    
    await bnstoken.withdrawToken(bnsstoken.address, 100000000, {from : bnssOwner});

    let balance_after_with = await bnstoken.tokenBalanceOf.call(bnsstoken.address, bnssOwner);

    assert.equal((init_token_balance - balance_after_with), 100000000, 'Correct amount of BNS withdrawn from contract');

    await truffleAssert.reverts(
      bnstoken.withdrawToken(bnsstoken.address, 100000000, {from : accounts[4]}),
      "VM Exception while processing transaction: revert"
    ); 

    await truffleAssert.reverts(
      bnstoken.withdrawToken("0x0000000000000000000000000000000000000000", 100000000, {from : accounts[0]}),
      "VM Exception while processing transaction: revert"
    );

  });

  it("should be able to subscribe and charge a recurring payment", async function(){
    
    var accounts = await web3.eth.getAccounts();
    var bnssOwner = await bnsstoken.owner.call();
    var bnsOwner = await bnstoken.owner.call();

    await bnstoken.setMinPeriod(600,{from:bnsOwner});

    await truffleAssert.reverts(
      bnstoken.setMinPeriod(600, {from : accounts[5]}),
      "VM Exception while processing transaction: revert"
    );

    await bnstoken.setAddresses(bnsstoken.address, accounts[7], {from : bnsOwner});

    await truffleAssert.reverts(
      bnstoken.setAddresses(bnsstoken.address, accounts[7], {from : accounts[5]}),
      "VM Exception while processing transaction: revert"
    );

    await bnsstoken.transfer(accounts[5],10000000000,{from : bnssOwner});                             // giving 100 bnss to subscriber

    let bnss_balance_of_subscriber = await bnsstoken.balanceOf(accounts[5]);
    assert.equal(bnss_balance_of_subscriber,10000000000,"bnss transfer to subscriber unsuccessful");  // checking of he got it or not

    await bnsstoken.approve(bnstoken.address, 10000000000, {from : accounts[5]});                     // allow CoinBNS to spend BNSS
    await bnstoken.depositToken(bnsstoken.address, 10000000000, {from : accounts[5]});

    let balance_after_deposit = await bnstoken.tokenBalanceOf.call(bnsstoken.address, accounts[5]);
    assert.equal(balance_after_deposit,10000000000,"bnss deposit at bns unsuccessful");

    await bnstoken.subscribe(accounts[6],accounts[5],bnsstoken.address,1000000000,3600,{from:accounts[5]});

    let res1 = await bnstoken.getlistOfSubscriptions.call(accounts[5]);
    assert.equal(res1[0],1,"not updated list of subscription");

    let res2 = await bnstoken.getLatestOrderId.call();
    assert.equal(res2, 1, "subscribe unsuccessful");

    await bnstoken.charge(1,{from : accounts[6]});

    await truffleAssert.reverts(
      bnstoken.charge(100, {from : accounts[6]}),
      "VM Exception while processing transaction: revert"
    );

    await truffleAssert.reverts(
      bnstoken.charge(1, {from : accounts[8]}),
      "VM Exception while processing transaction: revert"
    );

    let b = await bnstoken.tokenBalanceOf.call(bnsstoken.address, accounts[5]); // subscriber's balance after one charge
    assert.equal(b, 9000000000, "charge unsuccessful");
    let fb = await bnstoken.tokenBalanceOf.call(bnsstoken.address, accounts[7]); // balance of fee account
    assert.equal(fb, 2500000, "fee balance wrong");
    let mb = await bnstoken.tokenBalanceOf.call(bnsstoken.address, accounts[6]); // balance of merchant
    assert.equal(mb, 997500000, "merchant balance wrong");

  });

  it("should be able to set minPeriod", async function(){

    var token = await te.deployed();              // deploying again so that things don't get mixed up
    var bnstoken = await bns.deployed();
    var bnsstoken = await bnss.deployed();
    var bnsbtoken = await bnsb.deployed();

    var accounts = await web3.eth.getAccounts();
    var bnssOwner = await bnsstoken.owner.call();
    var bnsOwner = await bnstoken.owner.call();

    await bnstoken.setMinPeriod(600,{from:bnsOwner});
    var result = await bnstoken.minPeriod.call();
    assert.equal(result, 600, "setMinPeriod failed");

    await truffleAssert.reverts(
      bnstoken.setMinPeriod(600, {from : accounts[6]}),
      "VM Exception while processing transaction: revert"
    );

  });

  it("should be able to set addresses",async function(){
    var token = await te.deployed();              // deploying again so that things don't get mixed up
    var bnstoken = await bns.deployed();
    var bnsstoken = await bnss.deployed();
    var bnsbtoken = await bnsb.deployed();

    var accounts = await web3.eth.getAccounts();
    var bnssOwner = await bnsstoken.owner.call();
    var bnsOwner = await bnstoken.owner.call();

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

  it("should be able to subscribe to spp and owner should be able to chargeSpp", async function(){

    var token = await te.deployed();              // deploying again so that things don't get mixed up
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
    assert.equal((balance_after_deposit - init_token_balance), 1000 * 1e8, 'Correct amount of BNSB deposited to contract');

    let receipt = await bnstoken.subscribeToSpp(accounts[2],10*1e8,2*86400,bnsbtoken.address,bnsstoken.address,{from:accounts[2]}); // deposits are done, now accounts[2] starts a spp

    let gasUsed = receipt.receipt.gasUsed;
    assert.equal(gasUsed, 342111, 'Gas amount changed');

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

    let results = await bnstoken.chargeSpp(1,1e8,10*1e8,500, {from:bnsOwner});

    assert.equal(results.receipt.gasUsed, 166838, 'Gas amount for charge SPP changed');

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

    let nonce = 0;
    let expires = 0;

    truffleAssert.eventEmitted(results, 'ChargeSpp', (ev) => {
        nonce = ev.nonce;
        expires = ev.expires;
        return ev.sppID == 1;
    }, "Contract should emit correct event");

    await token.trade(bnsbtoken.address, 1e8, bnsstoken.address, 10*1e8, expires, nonce, accounts[2], 1e8, {from:accounts[1]});

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

    let bnss_balance_of_trader_after_trade = await token.balanceOf.call(bnsstoken.address, accounts[1]);
    let bnsb_balance_of_trader_after_trade = await token.balanceOf.call(bnsbtoken.address, accounts[1]);
    let bnss_balance_of_subscriber_after_trade = await token.balanceOf.call(bnsstoken.address, accounts[2]);
    let bnsb_balance_of_subscriber_after_trade = await token.balanceOf.call(bnsbtoken.address, accounts[2]);

    assert.equal(bnss_balance_of_trader_after_trade,997500000,"balances after trade are wrong");
    assert.equal(bnsb_balance_of_trader_after_trade,99900000000,"balances after trade are wrong");
    assert.equal(bnss_balance_of_subscriber_after_trade,986*1e8,"balances after trade are wrong");
    assert.equal(bnsb_balance_of_subscriber_after_trade,99750000,"balances after trade are wrong");

  });

  it("should reflect proper current token amounts", async function(){
        let res1 = await bnstoken.getTokenStats.call(1);
        assert.equal(res1[0],bnsbtoken.address,"tokenToGet incorrect");
        assert.equal(res1[1],bnsstoken.address,"tokenToGive incorrect");

        let res2 = await bnstoken.getcurrentTokenAmounts.call(1);
        assert.equal(res2[0],99750000,"incorrect amount upadted");
        assert.equal(res2[1],10*1e8,"incorrect amount updated");
  });

  it("should be able to set TradeEngineAddress",async function(){

    var token = await te.deployed();              
    var bnstoken = await bns.deployed();
    var bnsstoken = await bnss.deployed();
    var bnsbtoken = await bnsb.deployed();

    var accounts = await web3.eth.getAccounts();
    var bnssOwner = await bnsstoken.owner.call();
    var bnsOwner = await bnstoken.owner.call();

    await bnstoken.setTradeEngineAddress(token.address,{from:bnsOwner});
    let res = await bnstoken.TradeEngineAddress.call();
    assert.equal(res,token.address,"setTradeEngineAddress failed");

    await truffleAssert.reverts(
      bnstoken.setTradeEngineAddress(token.address, {from : accounts[6]}),
      "VM Exception while processing transaction: revert"
    );

  });

  it("should be able to set bnsAddress",async function(){
    var token = await te.deployed();              
    var bnstoken = await bns.deployed();
    var bnsstoken = await bnss.deployed();
    var bnsbtoken = await bnsb.deployed();

    var accounts = await web3.eth.getAccounts();
    var bnssOwner = await bnsstoken.owner.call();
    var bnsOwner = await bnstoken.owner.call();
    var teOwner = await token.admin.call();

    await token.setbnsAddress(bnstoken.address,{from:teOwner});
    let res = await token.bnsAddress.call();
    assert.equal(res, bnstoken.address,"setbnsAddress failed");

    await truffleAssert.reverts(
      token.setbnsAddress(bnstoken.address, {from : accounts[6]}),
      "VM Exception while processing transaction: revert"
    );
    
  });

  it("should be able to set UsdtDecimal",async function(){
    var token = await te.deployed();              
    var bnstoken = await bns.deployed();
    var bnsstoken = await bnss.deployed();
    var bnsbtoken = await bnsb.deployed();

    var accounts = await web3.eth.getAccounts();
    var bnssOwner = await bnsstoken.owner.call();
    var bnsOwner = await bnstoken.owner.call();

    await bnstoken.setUsdtDecimal(8,{from:bnsOwner});
    let res = await bnstoken.usdtDecimal.call();
    assert.equal(res, 8,"setUsdtDecimal failed");

    await truffleAssert.reverts(
      bnstoken.setUsdtDecimal(8,{from : accounts[6]}),
      "VM Exception while processing transaction: revert"
    );
    
  });

  it("should be able to set rateTrxUsdt",async function(){
    var token = await te.deployed();              
    var bnstoken = await bns.deployed();
    var bnsstoken = await bnss.deployed();
    var bnsbtoken = await bnsb.deployed();

    var accounts = await web3.eth.getAccounts();
    var bnssOwner = await bnsstoken.owner.call();
    var bnsOwner = await bnstoken.owner.call();

    await bnstoken.setrateTrxUsdt(100000000,{from:bnsOwner});
    let res = await bnstoken.rateTrxUsdt.call();
    assert.equal(res, 100000000, "setrateTrxUsdt failed");

    await truffleAssert.reverts(
      bnstoken.setrateTrxUsdt(100000000, {from : accounts[6]}),
      "VM Exception while processing transaction: revert"
    );
    
  });

  it("should be able to set FeePercent",async function(){
    var token = await te.deployed();              
    var bnstoken = await bns.deployed();
    var bnsstoken = await bnss.deployed();
    var bnsbtoken = await bnsb.deployed();

    var accounts = await web3.eth.getAccounts();
    var bnssOwner = await bnsstoken.owner.call();
    var bnsOwner = await bnstoken.owner.call();
    var teOwner = await token.admin.call();

    await token.setFeePercent(25,{from:teOwner});
    let res = await token.fee.call();
    assert.equal(res,25,"setFeePercent failed");

    await truffleAssert.reverts(
      token.setFeePercent(25,{from : accounts[6]}),
      "VM Exception while processing transaction: revert"
    );
    
  });

});