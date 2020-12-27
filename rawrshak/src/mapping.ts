import { ByteArray, BigInt, crypto } from "@graphprotocol/graph-ts"
import {
  OVCToken,
  TokenCreated,
  Transfer
} from "../generated/OVCToken/OVCToken"
import { 
  Token,
  TokenBalance,
  Account
 } from "../generated/schema"
 import {Address} from "@graphprotocol/graph-ts/index";

export function handleTokenCreated(event: TokenCreated): void {
  // let tokenId = crypto.keccak256(event.params.name.).toHexString();
  let tokenId = event.params.id.toHex();
  let token = Token.load(tokenId);
  if (token == null) {
    token = new Token(tokenId);
  }
  token.contractAddress = event.params.addr;
  token.name = event.params.name;
  token.symbol = event.params.symbol;
  token.createdAt = event.block.timestamp;
  token.supply = event.params.supply;
  token.save();
  
  // create deployer account
  let deployerId = event.transaction.from.toHex();
  let deployer = Account.load(deployerId);
  if (deployer == null) {
    deployer = new Account(deployerId);
    deployer.address = event.transaction.from;
  }
  deployer.save();

  // create initial token balance
  let tokenBalanceId = crypto.keccak256(concat(event.params.addr, event.transaction.from)).toHexString();
  let tokenBalance = TokenBalance.load(tokenBalanceId);
  if (tokenBalance == null) {
    let tokenContract = OVCToken.bind(event.params.addr);
    tokenBalance = new TokenBalance(tokenBalanceId);
    tokenBalance.amount = BigInt.fromI32(0);
    tokenBalance.token = tokenContract.tokenId().toHex();
    tokenBalance.owner = event.transaction.from.toHex();
  }
}

export function handleTransfer(event: Transfer): void {
  // let id = crypto.keccak256(name).toHexString()
  // Get User To and add if it doesn't exist
  let userToId = event.params.to.toHex();
  let userTo = Account.load(userToId);
  if (userTo == null) {
    userTo = new Account(userToId);
    userTo.address = event.params.to;
  }
  userTo.save();
  
  // Add the amount to that user's TokenBalance
  let tokenBalanceId = crypto.keccak256(concat(event.address, event.params.to)).toHexString();
  let tokenBalance = TokenBalance.load(tokenBalanceId);
  if (tokenBalance == null) {
    tokenBalance = new TokenBalance(tokenBalanceId);
    tokenBalance.amount = BigInt.fromI32(0);
    tokenBalance.token = event.address.toHex();
    tokenBalance.owner = event.params.to.toHex();
  }
  tokenBalance.amount = tokenBalance.amount.plus(event.params.value);
  tokenBalance.save()

  // Subract the amount tothe User from's token balance
  tokenBalanceId = crypto.keccak256(concat(event.address, event.params.from)).toHexString();
  tokenBalance = TokenBalance.load(tokenBalanceId);
  if (tokenBalance == null) {
    tokenBalance = new TokenBalance(tokenBalanceId);
    tokenBalance.amount = BigInt.fromI32(0);
    tokenBalance.token = event.address.toHex();
    tokenBalance.owner = event.params.from.toHex();
  }
  tokenBalance.amount = tokenBalance.amount.minus(event.params.value);
  tokenBalance.save()
}

// Helper for concatenating two byte arrays
function concat(a: ByteArray, b: ByteArray): ByteArray {
  let out = new Uint8Array(a.length + b.length)
  for (let i = 0; i < a.length; i++) {
    out[i] = a[i]
  }
  for (let j = 0; j < b.length; j++) {
    out[a.length + j] = b[j]
  }
  return out as ByteArray
}
