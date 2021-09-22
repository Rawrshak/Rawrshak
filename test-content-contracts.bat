@echo off 
echo Running Content Contracts Tests...

call truffle compile

call truffle test --compile-none --debug ./test/content/HasTokenUriTests.js ./test/content/HasRoyaltiesTests.js ./test/content/HasContractUriTests.js
call truffle test --compile-none --debug ./test/content/AccessControlManagerTests.js
call truffle test --compile-none --debug ./test/content/ContentStorageTests.js
call truffle test --compile-none --debug ./test/content/ContentTests.js
call truffle test --compile-none --debug ./test/content/ContentManagerTests.js
call truffle test --compile-none --debug ./test/content/ContentFactoryTests.js