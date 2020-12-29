import { ByteArray, BigInt, crypto } from "@graphprotocol/graph-ts"
import { LootboxContractCreated } from "../generated/LootboxFactory/LootboxFactory"
import {
    InputItemBatchRegistered,
    RewardItemBatchRegistered,
    TradeMinimumSet,
    LootboxGenerated,
    LootboxOpened, 
    TransferSingle,
    TransferBatch,
    Lootbox as LootboxContract
} from "../generated/templates/Lootbox/Lootbox"

import { 
    Lootbox,
    LootboxEntry,
    LootboxMaterial,
    LootboxReward
} from "../generated/schema"
   
export function handleLootboxContractCreated(event: LootboxContractCreated): void {
  let id = event.params.id.toHex();
  let lootbox = new Lootbox(id);
  lootbox.owner = event.params.owner.toHex();
  lootbox.contractAddress = event.params.contractAddr;
  lootbox.tradeInMinimum = BigInt.fromI32(4);   // 4 is the default - todo: make this dynamic
  lootbox.minted = BigInt.fromI32(0);
  lootbox.opened = BigInt.fromI32(0);
  lootbox.save();
}

export function handleInputItemBatchRegistered(event: InputItemBatchRegistered): void {
  // uint256 id, uint256[] itemIds, uint256[] amounts, uint256[] multipliers
  let itemIds = event.params.itemIds;
  let amounts = event.params.amounts;
  let multipliers = event.params.multipliers;
  let id = ByteArray.fromI32(event.params.id.toI32());
  for (let index = 0, length = event.params.itemIds.length; index < length; ++index) {
    let materialId = crypto.keccak256(concat(id, ByteArray.fromI32(itemIds[index].toI32()))).toHex();
    let material = new LootboxMaterial(materialId);
    material.lootbox = event.params.id.toHex();
    material.item = itemIds[index].toHex();
    material.requiredAmount = amounts[index];
    material.multiplier = multipliers[index];
    material.active = true;
    material.save();
  }
}

export function handleRewardItemBatchRegistered(event: RewardItemBatchRegistered): void {
  // uint256 id, uint256[] itemIds, uint256[] amounts, uint256[] multipliers
  let itemIds = event.params.itemIds;
  let amounts = event.params.amounts;
  let rarities = event.params.rarities;
  let id = ByteArray.fromI32(event.params.id.toI32());
  for (let index = 0, length = event.params.itemIds.length; index < length; ++index) {
    let rewardId = crypto.keccak256(concat(id, ByteArray.fromI32(itemIds[index].toI32()))).toHex();
    let reward = new LootboxReward(rewardId);
    reward.lootbox = event.params.id.toHex();
    reward.item = itemIds[index].toHex();
    reward.amount = amounts[index];
    reward.rarity = rarities[index];
    reward.active = true;
    reward.save();
  }}

export function handleTradeMinimumSet(event: TradeMinimumSet): void {
  let lootbox = Lootbox.load(event.params.id.toHex());
  if (lootbox != null) {
    lootbox.tradeInMinimum = event.params.tradeInMinimum;
    lootbox.save();
  }
}

export function handleLootboxGenerated(event: LootboxGenerated): void {
  // lootboxId, msg.sender, lootboxCount
  let id = ByteArray.fromI32(event.params.id.toI32());
  let lootboxEntryId = crypto.keccak256(concat(id, event.params.owner)).toHex();
  let lootboxEntry = LootboxEntry.load(lootboxEntryId);
  if (lootboxEntry == null) {
    lootboxEntry = new LootboxEntry(lootboxEntryId);
    lootboxEntry.owner = event.params.owner.toHex();
    lootboxEntry.lootbox = event.params.id.toHex();
    lootboxEntry.amount = BigInt.fromI32(0);
  }
  lootboxEntry.amount = lootboxEntry.amount.plus(event.params.amount);
  lootboxEntry.save();
}

export function handleLootboxOpened(event: LootboxOpened): void {
  // lootboxId, msg.sender, _count, rewards
  let id = ByteArray.fromI32(event.params.id.toI32());
  let lootboxEntryId = crypto.keccak256(concat(id, event.params.owner)).toHex();
  let lootboxEntry = LootboxEntry.load(lootboxEntryId);
  if (lootboxEntry != null) {
    lootboxEntry.amount = lootboxEntry.amount.minus(event.params.amount);
    lootboxEntry.save();
  }
}

export function handleTransferSingle(event: TransferSingle): void {
  let lootboxContract = LootboxContract.bind(event.address);
  let id = ByteArray.fromI32(event.params.id.toI32());
  let lootboxEntryId = crypto.keccak256(concat(id, event.params.to)).toHex();
  let lootboxEntry = LootboxEntry.load(lootboxEntryId);
  if (lootboxEntry == null) {
    lootboxEntry = new LootboxEntry(lootboxEntryId);
    lootboxEntry.amount = BigInt.fromI32(0);
  }
  lootboxEntry.owner = event.params.to.toHex();
  lootboxEntry.lootbox = lootboxContract.lootboxId().toHex();
  lootboxEntry.amount = lootboxEntry.amount.plus(event.params.value);
  lootboxEntry.save();

  // remove lootbox from the previous owner
  lootboxEntryId = crypto.keccak256(concat(id, event.params.from)).toHex();
  lootboxEntry = LootboxEntry.load(lootboxEntryId);
  if (lootboxEntry != null) {
    lootboxEntry.amount = lootboxEntry.amount.minus(event.params.value);
    lootboxEntry.save();
  }
}

export function handleTransferBatch(event: TransferBatch): void {
  let lootboxContract = LootboxContract.bind(event.address);
  let ids = event.params.ids;
  let values = event.params.values;
  for (let index = 0, length = event.params.ids.length; index < length; ++index) {
    let id = ByteArray.fromI32(ids[index].toI32());
    let lootboxEntryId = crypto.keccak256(concat(id, event.params.to)).toHex();
    let lootboxEntry = LootboxEntry.load(lootboxEntryId);
    if (lootboxEntry == null) {
      lootboxEntry = new LootboxEntry(lootboxEntryId);
      lootboxEntry.amount = BigInt.fromI32(0);
    }
    lootboxEntry.owner = event.params.to.toHex();
    lootboxEntry.lootbox = lootboxContract.lootboxId().toHex();
    lootboxEntry.amount = lootboxEntry.amount.plus(values[index]);
    lootboxEntry.save();
  
    // remove lootbox from the previous owner
    lootboxEntryId = crypto.keccak256(concat(id, event.params.from)).toHex();
    lootboxEntry = LootboxEntry.load(lootboxEntryId);
    if (lootboxEntry != null) {
      lootboxEntry.amount = lootboxEntry.amount.minus(values[index]);
      lootboxEntry.save();
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