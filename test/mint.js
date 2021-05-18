const EIP712 = require("./EIP712");

const Types = {
	MintData: [
		{name: 'to', type: 'address'},
		{name: 'tokenIds', type: 'uint256[]'},
		{name: 'amounts', type: 'uint256[]'},
		{name: 'nonce', type: 'uint256'},
		{name: 'signer', type: 'address'}
	]
};

async function sign(to, tokenIds, amounts, nonce, signer, verifyingContract) {
	const chainId = Number(await web3.eth.getChainId());
	const data = EIP712.createTypeData({
		name: "MintData",
		version: "1",
		chainId,
		verifyingContract
	}, 'MintData', { to, tokenIds, amounts, nonce, signer }, Types);
	return (await EIP712.signTypedData(web3, signer, data)).sig;
}

module.exports = { sign }