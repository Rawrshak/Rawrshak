const { ethers, upgrades } = require("hardhat");

var Content;
var ContentManager;
var Exchange;

async function createOrder(exchange, account, orderData) {
    var tx = await exchange.connect(account).placeOrder(orderData);
    // var receipt = await tx.wait();
    // var orderPlaced = receipt.events?.filter((x) => {return x.event == "OrderPlaced"});

    // // Get Order Data
    // var orderId = orderPlaced[0].args.orderId;
    // console.log(`\n`);
    // console.log(`Order ${orderId}`);

    // var orderData = await exchange.connect(account).getOrder(orderId);
    // console.log(`Order ${orderId} Amount Ordered: ${orderData.amountOrdered}`);
    // console.log(`Order ${orderId} isBuyOrder: ${orderData.isBuyOrder}`);

    // console.log(`Player Address: ${account.address}`);
    // console.log(`Order ${orderId} Owner: ${orderData.owner}`);
    // console.log(`Order ${orderId} Price: ${web3.utils.fromWei(orderData.price.toString(), 'ether')}`);
    // console.log(`Order ${orderId} Amount Ordered: ${orderData.amountOrdered}`);
    // console.log(`Order ${orderId} isBuyOrder: ${orderData.isBuyOrder}`);
    // console.log(`Order ${orderId} Order State: ${orderData.state}`);
}

async function main() {
    const _1e18 = ethers.BigNumber.from('10').pow(ethers.BigNumber.from('18'));

    const [
        deployer,
        dev1,
        dev2,
        dev3,
        player1,
        player2,
        player3,
        player4
    ] = await ethers.getSigners();
    
    // Get Rawr token stuff
    const MockToken = await ethers.getContractFactory("MockToken");
    const rawr = MockToken.attach("0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0");

    console.log(`Deploying contracts with the account: ${deployer.address}`);
  
    var balance = await deployer.getBalance();
    console.log(`Account Balance: ${balance.toString()}`);
    balance = await rawr.balanceOf(player1.address);
    console.log(`RawrshakAccount Balance [Player 1]: ${balance.toString()}`);

    // Get Contracts 
    Content = await ethers.getContractFactory("Content");
    ContentManager = await ethers.getContractFactory("ContentManager");
    const rawrshakContract = Content.attach("0x55652FF92Dc17a21AD6810Cce2F4703fa2339CAE");
    // const rawrshakContractManager = Content.attach("0xBf5A316F4303e13aE92c56D2D8C9F7629bEF5c6e");

    // Developer mints Asset 3 and 4 to player 1
    var mintData = [player1.address, [3,4], [5,5], 0, ethers.constants.AddressZero, []];
    await rawrshakContract.connect(dev1).mintBatch(mintData);

    // Developer mints Asset 1,2,5 to player 2
    var mintData = [player2.address, [1,2,5], [5,5,5], 0, ethers.constants.AddressZero, []];
    await rawrshakContract.connect(dev1).mintBatch(mintData);

    const screamContract = Content.attach("0x79E4D62d828379720db8E0E9511e10e6Bac05351");
    // Developer mints Asset 3 and 4 to player 1
    var mintData = [player1.address, [0,1,2,3,4], [5,5,5,5,5], 0, ethers.constants.AddressZero, []];
    await screamContract.connect(dev1).mintBatch(mintData);

    // Developer mints Asset 1,2,5 to player 2
    var mintData = [player2.address, [1,2,6,5,5], [5,5,5,5,5], 0, ethers.constants.AddressZero, []];
    await screamContract.connect(dev1).mintBatch(mintData);

    Exchange = await ethers.getContractFactory("Exchange");
    const exchange = Exchange.attach("0xa85233C63b9Ee964Add6F2cffe00Fd84eb32338f");

    if (exchange != null) {
        console.log(`Exchange exists!`);

        // Approve the exchange escrow for the rawrshak content contract
        // Approve the exchange escrow for the rawr token
        await rawr.connect(player1).approve(await exchange.tokenEscrow(), web3.utils.toWei('300', 'ether'));
        await rawr.connect(player2).approve(await exchange.tokenEscrow(), web3.utils.toWei('300', 'ether'));
        await rawrshakContract.connect(player1).setApprovalForAll(await exchange.nftsEscrow(), true);
        await rawrshakContract.connect(player2).setApprovalForAll(await exchange.nftsEscrow(), true);

        // Players 1 and 2 are sellers
        console.log("Creating Demo Orders");

        // Place Order:  Unfilled Sell Orders
        var orderData = [ [rawrshakContract.address, 3], player1.address, rawr.address, web3.utils.toWei('10', 'ether'), 1, false];
        await createOrder(exchange, player1, orderData);
        orderData = [ [rawrshakContract.address, 3], player1.address, rawr.address, web3.utils.toWei('11', 'ether'), 2, false];
        await createOrder(exchange, player1, orderData);

        // Place Order: Partially Filled Sell Orders
        orderData = [ [rawrshakContract.address, 4], player1.address, rawr.address, web3.utils.toWei('10', 'ether'), 4, false];
        await createOrder(exchange, player1, orderData);

        // Place Order: Filled Sell Orders
        orderData = [ [rawrshakContract.address, 2], player2.address, rawr.address, web3.utils.toWei('14', 'ether'), 2, false];
        await createOrder(exchange, player2, orderData);

        // Place Order: Filled Sell Orders
        orderData = [ [rawrshakContract.address, 1], player2.address, rawr.address, web3.utils.toWei('20', 'ether'), 1, false];
        await createOrder(exchange, player2, orderData);
        
        await rawr.connect(player3).approve(await exchange.tokenEscrow(), web3.utils.toWei('300', 'ether'));
        await rawr.connect(player4).approve(await exchange.tokenEscrow(), web3.utils.toWei('300', 'ether'));
        // Players 3 and 4 are buyers
        // Place Order:  Unfilled Buy Orders
        var orderData = [ [screamContract.address, 0], player3.address, rawr.address, web3.utils.toWei('10', 'ether'), 1, true];
        await createOrder(exchange, player3, orderData);
        orderData = [ [screamContract.address, 1], player3.address, rawr.address, web3.utils.toWei('11', 'ether'), 2, true];
        await createOrder(exchange, player3, orderData);

        // Place Order: Partially Filled Buy Orders
        orderData = [ [screamContract.address, 2], player3.address, rawr.address, web3.utils.toWei('10', 'ether'), 4, true];
        await createOrder(exchange, player3, orderData);

        // Place Order: Filled Buy Orders
        orderData = [ [screamContract.address, 5], player4.address, rawr.address, web3.utils.toWei('14', 'ether'), 2, true];
        await createOrder(exchange, player4, orderData);

        // Place Order: Filled Buy Orders
        orderData = [ [screamContract.address, 6], player4.address, rawr.address, web3.utils.toWei('20', 'ether'), 1, true];
        await createOrder(exchange, player4, orderData);

        console.log("Approving Scream Contract");
        await screamContract.connect(player1).setApprovalForAll(await exchange.nftsEscrow(), true);
        await screamContract.connect(player2).setApprovalForAll(await exchange.nftsEscrow(), true);
        
        // Filling some Sell Orders
        console.log("Filling Some Sell Orders");
        await exchange.connect(player3).fillSellOrder([0, 1], 2); // Fill 0, partial fill 1
        await exchange.connect(player3).fillSellOrder([4], 1); // Fill 4 (to be claimed)

        // Fill some Buy Orders
        console.log("Filling Some Buy Orders");
        await exchange.connect(player1).fillBuyOrder([5], 1); // Fill 5
        await exchange.connect(player1).fillBuyOrder([6], 1); // Partially Fill 6
        await exchange.connect(player2).fillBuyOrder([8], 2); // Fill Fill 8 (to be claimed)

        // Claim Buy Order
        console.log("Claiming a Buy Order");
        await exchange.connect(player4).claimOrders([8]); // Claim 8 (to be claimed)

        // Claim Sell Order
        console.log("Claiming a Sell Order");
        await exchange.connect(player2).claimOrders([4]); // Claim 4 (to be claimed)

        // Cancel a buy order and a sell order
        console.log("Cancelling Some Orders");
        await exchange.connect(player4).cancelOrders([9]); // Cancel 9
        await exchange.connect(player2).cancelOrders([3]); // Cancel 3

        // Developer Claim Royalties
        console.log("Developer Claiming some royalties");
        await exchange.connect(dev1).claimRoyalties();
    }
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });