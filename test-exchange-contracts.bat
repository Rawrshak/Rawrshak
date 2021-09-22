@echo off 
echo Running Exchange Contracts Tests...

call truffle compile

call truffle test --compile-none --debug ./test/exchange/AddressRegistryTests.js
call truffle test --compile-none --debug ./test/exchange/Erc20EscrowTests.js 
call truffle test --compile-none --debug ./test/exchange/NftEscrowTests.js
call truffle test --compile-none --debug ./test/exchange/RoyaltyManagerTests.js ./test/exchange/OrderbookTests.js
call truffle test --compile-none --debug ./test/exchange/ExecutionManagerBuyTests.js
call truffle test --compile-none --debug ./test/exchange/ExecutionManagerSellTests.js
call truffle test --compile-none --debug ./test/exchange/ExchangeTests.js