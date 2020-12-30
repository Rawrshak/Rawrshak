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

import { GlobalItemRegistry } from "../generated/templates/Game/GlobalItemRegistry"

import { 
  Game as GameData,
  Item,
  ItemBalance,
  Account,
 } from "../generated/schema"
import {Address} from "@graphprotocol/graph-ts/index";

import { Game as GameContract } from "../generated/templates"

let registryAddress = '0x526Cb9dB0fa24cd59bd73C597131734962091667';
let registry = GlobalItemRegistry.bind(Address.fromHexString(registryAddress) as Address);
let zeroAddress = '0x0000000000000000000000000000000000000000';

export function handleGameContractCreated(event: GameContractCreated): void {
  // Start indexing events from GameContract address 
  GameContract.create(event.params.addr);
  let id = event.params.id.toHex();
  let game = new GameData(id);
  game.contractAddress = event.params.addr;
  let managerContract = GameManager.bind(event.params.owner);
  game.owner = managerContract.owner().toHex();
  game.gameManagerContractAddress = event.params.owner;
  game.save();
}

export function handleGameManagerSet(event: GameManagerSet): void {
  let id = event.params.gameId.toHex();
  let game = GameData.load(id);
  if (game != null) {
    game.gameManagerContractAddress = event.params.managerAddr;
    game.save();
  }
}

export function handleItemCreated(event: ItemCreated): void {
  // Note: Hardcoding latest registry address
  let id = registry.getUUID(event.address, event.params.id).toHex();
  let item = new Item(id);
  item.game = event.params.gameId.toHex();
  item.gameItemId = event.params.id;
  item.maxSupply = event.params.maxSupply;
  item.currentSupply = BigInt.fromI32(0);
  item.creatorAddress = event.params.creatorAddr;
  item.save();
}

export function handleItemBatchCreated(event: ItemBatchCreated): void {
  let ids = event.params.ids;
  let maxSupplies = event.params.maxSupplies;
  for (let index = 0, length = ids.length; index < length; ++index) {
    let id = registry.getUUID(event.address, ids[index]).toHex();
    let item = Item.load(id);
    if (item == null) {
      item = new Item(id);
    }
    item.game = event.params.gameId.toHex();
    item.gameItemId = ids[index];
    item.maxSupply = maxSupplies[index];
    item.currentSupply = BigInt.fromI32(0);
    item.creatorAddress = event.params.creatorAddr;
    item.save();
  }
}

export function handleItemSupplyChanged(event: ItemSupplyChanged): void {
  let id = registry.getUUID(event.address, event.params.id).toHex();
  let item = Item.load(id);
  if (item != null) {
    item.currentSupply = event.params.currentSupply;
    item.save();
  }
}

export function handleItemBatchSupplyChanged(event: ItemBatchSupplyChanged): void {
  let ids = event.params.ids;
  let currentSupplies = event.params.currentSupplies;
  for (let index = 0, length = event.params.ids.length; index < length; ++index) {
    let id = registry.getUUID(event.address, ids[index]).toHex();
    let item = Item.load(id);
    if (item != null) {
      item.currentSupply = currentSupplies[index];
      item.save();
    }
  }
}

export function handleTransferSingle(event: TransferSingle): void {
  if (event.params.to.toHex() != zeroAddress) {
    let id = crypto.keccak256(concat(ByteArray.fromI32(event.params.id.toI32()), event.params.to)).toHex();
    let itemBalance = ItemBalance.load(id);
    if (itemBalance == null) {
      itemBalance = new ItemBalance(id);
      itemBalance.amount = BigInt.fromI32(0);
      itemBalance.owner = event.params.to.toHex();
      itemBalance.item = registry.getUUID(event.address, event.params.id).toHex();
    }
    itemBalance.amount = itemBalance.amount.plus(event.params.value);
    itemBalance.save();
  }

  // remove item from the previous owner
  let id = crypto.keccak256(concat(ByteArray.fromI32(event.params.id.toI32()), event.params.from)).toHex();
  let itemBalance = ItemBalance.load(id);
  if (itemBalance != null) {
    itemBalance.amount = itemBalance.amount.minus(event.params.value);
    itemBalance.save();
  }
}

export function handleTransferBatch(event: TransferBatch): void {
  let values = event.params.values;
  let ids = event.params.ids;
  for (let index = 0, length = ids.length; index < length; ++index) {
    // operator, from, to, id, value
    if (event.params.to.toHex() != zeroAddress) {
      let id = crypto.keccak256(concat(ByteArray.fromI32(ids[index].toI32()), event.params.to)).toHex();
      let itemBalance = ItemBalance.load(id);
      if (itemBalance == null) {
        itemBalance = new ItemBalance(id);
      }
      itemBalance.owner = event.params.to.toHex();
      
      itemBalance.item = registry.getUUID(event.address, ids[index]).toHex();
      itemBalance.amount = values[index];
      itemBalance.save();
    }

    // remove item from the previous owner
    let id = crypto.keccak256(concat(ByteArray.fromI32(ids[index].toI32()), event.params.from)).toHex();
    let itemBalance = ItemBalance.load(id);
    if (itemBalance != null) {
      itemBalance.amount = itemBalance.amount.minus(values[index]);
      itemBalance.save();
    }
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
