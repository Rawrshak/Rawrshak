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
import { Lootbox as LootboxTemplateContract } from "../generated/templates"
import { Address } from "@graphprotocol/graph-ts/index";
   
let zeroAddress = '0x0000000000000000000000000000000000000000';

export function handleLootboxContractCreated(event: LootboxContractCreated): void {
  LootboxTemplateContract.create(event.params.contractAddr);
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
  for (let index = 0, length = event.params.itemIds.length; index < length; ++index) {
    let materialId = createLootboxItemId(event.params.id, itemIds[index]);
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
  for (let index = 0, length = event.params.itemIds.length; index < length; ++index) {
    let rewardId = createLootboxItemId(event.params.id, itemIds[index]);
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
  let id = event.params.id.toHex();
  let lootbox = Lootbox.load(event.params.id.toHex());
  if (lootbox != null) {
    lootbox.minted = lootbox.minted.plus(event.params.amount);
    lootbox.save();
  }
}

export function handleLootboxOpened(event: LootboxOpened): void {
  let lootbox = Lootbox.load(event.params.id.toHex());
  if (lootbox != null) {
    lootbox.opened = lootbox.opened.plus(event.params.amount);
    lootbox.save();
  }
}

export function handleTransferSingle(event: TransferSingle): void {
  if (event.params.to.toHex() != zeroAddress) {
    let lootboxContract = LootboxContract.bind(event.address);
    let lootboxEntryId = createLootboxEntryId(event.params.id, event.params.to.toHexString());
    let lootboxEntry = LootboxEntry.load(lootboxEntryId);
    if (lootboxEntry == null) {
        lootboxEntry = new LootboxEntry(lootboxEntryId);
        lootboxEntry.amount = BigInt.fromI32(0);
        lootboxEntry.owner = event.params.to.toHex();
        lootboxEntry.lootbox = lootboxContract.lootboxId().toHex();
    }
    lootboxEntry.amount = lootboxEntry.amount.plus(event.params.value);
    lootboxEntry.save();
  }

  // remove lootbox from the previous owner
  let lootboxEntryId = createLootboxEntryId(event.params.id, event.params.from.toHexString());
  let lootboxEntry = LootboxEntry.load(lootboxEntryId);
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
    if (event.params.to.toHex() != zeroAddress) {
      let lootboxEntryId = createLootboxEntryId(ids[index], event.params.to.toHexString());
      let lootboxEntry = LootboxEntry.load(lootboxEntryId);
      if (lootboxEntry == null) {
        lootboxEntry = new LootboxEntry(lootboxEntryId);
        lootboxEntry.amount = BigInt.fromI32(0);
        lootboxEntry.owner = event.params.to.toHex();
        lootboxEntry.lootbox = lootboxContract.lootboxId().toHex();
      }
      lootboxEntry.amount = lootboxEntry.amount.plus(values[index]);
      lootboxEntry.save();
    }

    let lootboxEntryId = createLootboxEntryId(ids[index], event.params.from.toHexString());
    let lootboxEntry = LootboxEntry.load(lootboxEntryId);
    if (lootboxEntry != null) {
      lootboxEntry.amount = lootboxEntry.amount.minus(values[index]);
      lootboxEntry.save();
    }
  }
}

function createLootboxItemId(lootboxId: BigInt, itemId: BigInt): string {
    return lootboxId.toString().concat('-').concat(itemId.toString());
}

// Todo: change owner from 'string' to 'Address'. Keep it for now for readability though
function createLootboxEntryId(lootboxId: BigInt, owner: string): string {
    return lootboxId.toString().concat('-').concat(owner);
}