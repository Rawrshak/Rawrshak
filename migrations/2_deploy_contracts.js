const OVCToken = artifacts.require("OVCToken");

module.exports = function(deployer) {
    // deploy OVC token with 1,000,000,000 initial supply.
    deployer.deploy(OVCToken, 1000000000);
};
