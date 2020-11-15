const OVCTokenContract = artifacts.require("OVCToken");
const GameContract = artifacts.require("GameContract");

module.exports = function(deployer) {
    // deploy OVC token with 1,000,000,000 initial supply.
    deployer.deploy(OVCTokenContract, 1000000000);
    
    // deploy GameContract with test URL
    deployer.deploy(GameContract, "https://testgame.com/api/item/{id}.json");
};
