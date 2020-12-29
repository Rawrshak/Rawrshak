import { ByteArray, BigInt, crypto } from "@graphprotocol/graph-ts"
import { LootboxContractCreated } from "../generated/LootboxFactory/LootboxFactory"
import {
    InputItemBatchRegistered,
    RewardItemBatchRegistered,
    TradeMinimumSet,
    LootboxGenerated,
    LootboxOpened, 
    TransferSingle,
    TransferBatch
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
  for (let index = 0, length = event.params.itemIds.length; index < length; ++index) {
    let materialId = crypto.keccak256(concat(event.params.id.toI32(), event.params.itemIds[index].toI32())).toHexString();
    let material = new LootboxMaterial(materialId);
    material.lootbox = event.params.id.toHex();
    material.item = event.params.itemIds[index].toHex();
    material.requiredAmount = event.params.amounts[index];
    material.multiplier = event.params.multipliers[index];
    material.active = true;
    material.save();
  }
}

export function handleRewardItemBatchRegistered(event: RewardItemBatchRegistered): void {
  // uint256 id, uint256[] itemIds, uint256[] amounts, uint256[] multipliers
  for (let index = 0, length = event.params.itemIds.length; index < length; ++index) {
    let rewardId = crypto.keccak256(concat(event.params.id.toI32(), event.params.itemIds[index].toI32())).toHexString();
    let reward = new LootboxReward(rewardId);
    reward.lootbox = event.params.id.toHex();
    reward.item = event.params.itemIds[index].toHex();
    reward.amount = event.params.amounts[index];
    reward.rarity = event.params.rarities[index];
    reward.active = true;
    reward.save();
  }}

export function handleTradeMinimumSet(event: TradeMinimumSet): void {
  let lootbox = new Lootbox(event.params.id.toHex());
  if (lootbox != null) {
    lootbox.tradeInMinimum = event.params.tradeInMinimum;
    lootbox.save();
  }
}

export function handleLootboxGenerated(event: LootboxGenerated): void {
  // lootboxId, msg.sender, lootboxCount
  let lootboxEntryId = crypto.keccak256(concat(event.params.id.toI32(), event.params.owner)).toHexString();
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
  let lootboxEntryId = crypto.keccak256(concat(event.params.id.toI32(), event.params.owner)).toHexString();
  let lootboxEntry = LootboxEntry.load(lootboxEntryId);
  if (lootboxEntry != null) {
    lootboxEntry.amount = lootboxEntry.amount.minus(event.params.amount);
    lootboxEntry.save();
  }
}

export function handleTransferSingle(event: TransferSingle): void {
  let lootboxContract = Lootbox.bind(event.address);
  let lootboxEntryId = crypto.keccak256(concat(event.params.id.toI32(), event.params.to)).toHexString();
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
  lootboxEntryId = crypto.keccak256(concat(lootboxContract.gameId(), event.params.from)).toHexString();
  lootboxEntry = LootboxEntry.load(lootboxEntryId);
  if (lootboxEntry != null) {
    lootboxEntry.amount = lootboxEntry.amount.minus(event.params.value);
    lootboxEntry.save();
  }
}

export function handleTransferBatch(event: TransferBatch): void {
  let lootboxContract = Lootbox.bind(event.address);
  for (let index = 0, length = event.params.ids.length; index < length; ++index) {
    let lootboxEntryId = crypto.keccak256(concat(event.params.ids[index].toI32(), event.params.to)).toHexString();
    let lootboxEntry = LootboxEntry.load(lootboxEntryId);
    if (lootboxEntry == null) {
      lootboxEntry = new LootboxEntry(lootboxEntryId);
      lootboxEntry.amount = BigInt.fromI32(0);
    }
    lootboxEntry.owner = event.params.to.toHex();
    lootboxEntry.lootbox = lootboxContract.lootboxId().toHex();
    lootboxEntry.amount = lootboxEntry.amount.plus(event.params.values[index]);
    lootboxEntry.save();
  
    // remove lootbox from the previous owner
    lootboxEntryId = crypto.keccak256(concat(lootboxContract.gameId(), event.params.from)).toHexString();
    lootboxEntry = LootboxEntry.load(lootboxEntryId);
    if (lootboxEntry != null) {
      lootboxEntry.amount = lootboxEntry.amount.minus(event.params.values[index]);
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