import { ByteArray, BigInt, crypto } from "@graphprotocol/graph-ts"
import {
  RawrToken,
  TokenCreated,
  Transfer
} from "../generated/RawrToken/RawrToken"
import { 
  Token,
  TokenBalance,
  Account
 } from "../generated/schema"
 import {Address} from "@graphprotocol/graph-ts/index";

let zeroAddress = '0x0000000000000000000000000000000000000000';

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
}

export function handleTransfer(event: Transfer): void {  
  // Add the amount to that user's TokenBalance
  let tokenContract = RawrToken.bind(event.address);
  if (event.params.to.toHex() != zeroAddress) {
    // Get User To and add if it doesn't exist
    let userToId = event.params.to.toHex();
    let userTo = Account.load(userToId);
    if (userTo == null) {
      userTo = new Account(userToId);
      userTo.address = event.params.to;
    }
    userTo.save();

    let tokenBalanceId = createTokenBalanceId(event.address.toHexString(), event.params.to.toHexString());
    let tokenBalance = TokenBalance.load(tokenBalanceId);
    if (tokenBalance == null) {
      tokenBalance = new TokenBalance(tokenBalanceId);
      tokenBalance.amount = BigInt.fromI32(0);
      tokenBalance.token = tokenContract.tokenId().toHex();
      tokenBalance.owner = event.params.to.toHex();
    }
    tokenBalance.amount = tokenBalance.amount.plus(event.params.value);
    tokenBalance.save()
  }

  // Subract the amount to the User from's token balance (if address is not null)
  let tokenBalanceId = createTokenBalanceId(event.address.toHexString(), event.params.from.toHexString());
  let tokenBalance = TokenBalance.load(tokenBalanceId);
  if (tokenBalance != null) {
    tokenBalance.amount = tokenBalance.amount.minus(event.params.value);
    tokenBalance.save()
  }
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

// Todo: change owner from 'string' to 'Address'. Keep it for now for readability though
function createTokenBalanceId(tokenAddress: string, owner: string): string {
  return tokenAddress.concat('-').concat(owner);
}