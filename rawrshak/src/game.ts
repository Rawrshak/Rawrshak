import { ByteArray, BigInt, crypto } from "@graphprotocol/graph-ts"
import { GameContractCreated } from "../generated/GameFactory/GameFactory"
import { GameManager } from "../generated/templates/GameManager/GameManager"

import {
  GameManagerSet,
  ItemCreated,
  ItemBatchCreated,
  ItemSupplyChanged,
  ItemBatchSupplyChanged,
  TransferSingle,
  TransferBatch,
} from "../generated/templates/Game/Game"

import { 
  Game,
  Item,
  ItemBalance,
  Account,
 } from "../generated/schema"
import {Address} from "@graphprotocol/graph-ts/index";

export function handleGameContractCreated(event: GameContractCreated): void {
  let id = event.params.id.toHex();
  let game = new Game(id);
  game.contractAddress = event.params.addr;
  let managerContract = GameManager.bind(event.params.owner);
  game.owner = managerContract.owner().toHex();
  game.gameManagerContractAddress = event.params.owner;
  game.save();
}

export function handleGameManagerSet(event: GameManagerSet): void {
  let id = event.params.gameId.toHex();
  let game = Game.load(id);
  if (game != null) {
    game.gameManagerContractAddress = event.params.managerAddr;
    game.save();
  }
}

export function handleItemCreated(event: ItemCreated): void {
  let id = event.params.id.toHex();
  let item = new Item(id);
  item.game = event.params.gameId.toHex();
  item.maxSupply = event.params.maxSupply;
  item.currentSupply = BigInt.fromI32(0);
  item.creatorAddress = event.params.creatorAddr;
  item.save();
}

export function handleItemBatchCreated(event: ItemBatchCreated): void {
  for (let index = 0, length = event.params.ids.length; index < length; ++index) {
    let id = event.params.ids[index].toHex();
    let item = Item.load(id);
    if (item == null) {
      item = new Item(id);
    }
    item.game = event.params.gameId.toHex();
    item.maxSupply = event.params.maxSupplies[index];
    item.currentSupply = BigInt.fromI32(0);
    item.creatorAddress = event.params.creatorAddr;
    item.save();
  }
}

export function handleItemSupplyChanged(event: ItemSupplyChanged): void {
  let id = event.params.id.toHex();
  let item = Item.load(id);
  if (item != null) {
    item.currentSupply = event.params.currentSupply;
    item.save();
  }
}

export function handleItemBatchSupplyChanged(event: ItemBatchSupplyChanged): void {
  for (let index = 0, length = event.params.ids.length; index < length; ++index) {
    let id = event.params.ids[index].toHex();
    let item = Item.load(id);
    if (item != null) {
      item.currentSupply = event.params.currentSupplies[index];
      item.save();
    }
  }
}

export function handleTransferSingle(event: TransferSingle): void {
  let gameContract = Game.bind(event.address);
  let id = crypto.keccak256(concat(gameContract.gameId(), event.params.to)).toHexString();
  let itemBalance = ItemBalance.load(id);
  if (itemBalance == null) {
    itemBalance = new ItemBalance(id);
  }
  itemBalance.owner = event.params.to.toHex();
  itemBalance.item = event.params.id.toHex();
  itemBalance.amount = event.params.value;
  itemBalance.save();

  // remove item from the previous owner
  id = crypto.keccak256(concat(gameContract.gameId(), event.params.from)).toHexString();
  itemBalance = ItemBalance.load(id);
  if (itemBalance != null) {
    itemBalance.amount = itemBalance.amount.minus(event.params.value);
  }
  itemBalance.save();
}

export function handleTransferBatch(event: TransferBatch): void {
  for (let index = 0, length = event.params.ids.length; index < length; ++index) {
    // operator, from, to, id, value
    let gameContract = Game.bind(event.address);
    let id = crypto.keccak256(concat(gameContract.gameId(), event.params.to)).toHexString();
    let itemBalance = ItemBalance.load(id);
    if (itemBalance == null) {
      itemBalance = new ItemBalance(id);
    }
    itemBalance.owner = event.params.to.toHex();
    itemBalance.item = event.params.ids[index].toHex();
    itemBalance.amount = event.params.values[index];
    itemBalance.save();

    // remove item from the previous owner
    id = crypto.keccak256(concat(gameContract.gameId(), event.params.from)).toHexString();
    itemBalance = ItemBalance.load(id);
    if (itemBalance != null) {
      itemBalance.amount = itemBalance.amount.minus(event.params.values[index]);
    }
    itemBalance.save();
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
