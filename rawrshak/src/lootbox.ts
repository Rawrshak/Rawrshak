import { ByteArray, BigInt, crypto } from "@graphprotocol/graph-ts"
import { LootboxContractCreated } from "../generated/LootboxFactory/LootboxFactory"
import {
    InputItemBatchRegistered,
    RewardItemBatchRegistered,
    TradeMinimumSet,
    LootboxGenerated,
    LootboxOpened
} from "../generated/templates/Lootbox/Lootbox"

import { 
    Lootbox,
    Item,
    LootboxEntry,
    LootboxMaterial,
    LootboxReward,
    Account
   } from "../generated/schema"

   export function handleLootboxContractCreated(event: LootboxContractCreated): void {}
   
   export function handleInputItemBatchRegistered(event: InputItemBatchRegistered): void {}
   
   export function handleRewardItemBatchRegistered(event: RewardItemBatchRegistered): void {}
   
   export function handleTradeMinimumSet(event: TradeMinimumSet): void {}
   
   export function handleLootboxGenerated(event: LootboxGenerated): void {}
   
   export function handleLootboxOpened(event: LootboxOpened): void {}