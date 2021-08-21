import { ByteArray, BigInt, crypto } from "@graphprotocol/graph-ts"
import { GameContractCreated } from "../generated/GameFactory/GameFactory"
import { GameManager } from "../generated/GameFactory/GameManager"

import {
  Game,
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
import { Address } from "@graphprotocol/graph-ts/index";

import { Game as GameContract } from "../generated/templates"

let registryAddress = '0xb4cD37f92879f0381dC5f0CCa34533dE96711314';
let registry = GlobalItemRegistry.bind(Address.fromHexString(registryAddress) as Address);
let zeroAddress = '0x0000000000000000000000000000000000000000';

export function handleGameContractCreated(event: GameContractCreated): void {
  // Start indexing events from GameContract address 
  GameContract.create(event.params.addr);
  let id = event.params.id.toHex();
  let game = new GameData(id);
  game.contractAddress = event.params.addr;
  let managerContract = GameManager.bind(event.params.owner);

  // Add Game Developer Account if it doesn't exist
  let gameOwnerId = managerContract.owner().toHex();
  let gameOwner = Account.load(gameOwnerId);
  if (gameOwner == null) {
    gameOwner = new Account(gameOwnerId);
    gameOwner.address = managerContract.owner();
    gameOwner.save();
  }

  game.owner = gameOwnerId;
  game.gameManagerContractAddress = event.params.owner;

  let gameContractObject = Game.bind(event.params.addr);
  game.uri = gameContractObject.uri(BigInt.fromI32(0));
  game.itemsCount = BigInt.fromI32(0); 

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

  // increase item count
  let game = GameData.load(event.params.gameId.toHex());
  if (game != null) {
    // Todo: Somehow, items count isn't actually counting properly. Fix this eventually
    game.itemsCount = game.itemsCount.plus(BigInt.fromI32(1));
    game.save()
  }
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
  
  // increase item count
  let game = GameData.load(event.params.gameId.toHex());
  if (game != null) {
    // Todo: Somehow, items count isn't actually counting properly. Fix this eventually
    game.itemsCount = game.itemsCount.plus(BigInt.fromI32(ids.length));
    game.save()
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
    // Add user account if it doesn't exist
    let userToId = event.params.to.toHex();
    let userTo = Account.load(userToId);
    if (userTo == null) {
      userTo = new Account(userToId);
      userTo.address = event.params.to;
      userTo.save();
    }

    let id = createItemEntryId(event.params.id, event.params.to.toHexString());
    let itemBalance = ItemBalance.load(id);
    if (itemBalance == null) {
      itemBalance = new ItemBalance(id);
      itemBalance.amount = BigInt.fromI32(0);
      itemBalance.owner = userToId;
      itemBalance.item = registry.getUUID(event.address, event.params.id).toHex();
    }
    itemBalance.amount = itemBalance.amount.plus(event.params.value);
    itemBalance.save();
  }

  // remove item from the previous owner
  let id = createItemEntryId(event.params.id, event.params.from.toHexString());
  let itemBalance = ItemBalance.load(id);
  if (itemBalance != null) {
    itemBalance.amount = itemBalance.amount.minus(event.params.value);
    itemBalance.save();
  }
}

export function handleTransferBatch(event: TransferBatch): void {
  let values = event.params.values;
  let ids = event.params.ids;
  let userToId = event.params.to.toHex();
  
  // Add user account if it doesn't exist
  if (userToId != zeroAddress) {
    let userTo = Account.load(userToId);
    if (userTo == null) {
      userTo = new Account(userToId);
      userTo.address = event.params.to;
      userTo.save();
    }
  }
  
  let userToIdString = event.params.to.toHexString();
  let userFromIdString = event.params.from.toHexString();

  for (let index = 0, length = ids.length; index < length; ++index) {
    // operator, from, to, id, value
    if (userToId != zeroAddress) {
      let id = createItemEntryId(ids[index], userToIdString);
      let itemBalance = ItemBalance.load(id);
      if (itemBalance == null) {
        itemBalance = new ItemBalance(id);
      }
      itemBalance.owner = userToId;
      
      itemBalance.item = registry.getUUID(event.address, ids[index]).toHex();
      itemBalance.amount = values[index];
      itemBalance.save();
    }

    // remove item from the previous owner
    let id = createItemEntryId(ids[index], userFromIdString);
    let itemBalance = ItemBalance.load(id);
    if (itemBalance != null) {
      itemBalance.amount = itemBalance.amount.minus(values[index]);
      itemBalance.save();
    }
  }
}

// Todo: delete later. keep for now, in case I might need it
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
function createItemEntryId(itemId: BigInt, owner: string): string {
  return itemId.toString().concat('-').concat(owner);
}
