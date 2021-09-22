@echo off 
echo Running Exchange Contracts Tests...

call truffle compile

call truffle test --compile-none --debug ./test/staking/ExchangeFeesEscrowTests.js
call truffle test --compile-none --debug ./test/staking/LiquidityMiningTests.js 
call truffle test --compile-none --debug ./test/staking/StakingTests.js