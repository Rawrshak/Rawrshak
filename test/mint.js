const { ethers } = require("hardhat");

const Types = {
	MintData: [
		{name: 'to', type: 'address'},
		{name: 'tokenIds', type: 'uint256[]'},
		{name: 'amounts', type: 'uint256[]'},
		{name: 'nonce', type: 'uint256'},
		{name: 'signer', type: 'address'}
	]
};

async function sign(_to, _tokenIds, _amounts, _nonce, _signer, _contract) {
	const chainId = Number(await web3.eth.getChainId());
    const domain = {
        name: "MintData",
        version: "1",
        chainId: chainId,
        verifyingContract: _contract
    };

    const value = {
        to: _to,
        tokenIds: _tokenIds,
        amounts: _amounts,
        nonce: _nonce,
        signer: _signer
    };

    return await ethers.provider.getSigner(_signer)._signTypedData(domain, Types, value);
}

module.exports = { sign }