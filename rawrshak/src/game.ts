import { ByteArray, BigInt, crypto } from "@graphprotocol/graph-ts"


import { GameContractCreated } from "../generated/GameFactory/GameFactory"

import {
  GlobalItemRegistryStored,
  GameManagerSet,
  GameUriUpdated,
  ItemCreated,
  ItemBatchCreated,
  ItemSupplyChanged,
  ItemBatchSupplyChanged,
} from "../generated/templates/Game/Game"

import { 
  Game,
  Item,
  ItemBalance,
  Account
 } from "../generated/schema"
 import {Address} from "@graphprotocol/graph-ts/index";

export function handleGameContractCreated(event: GameContractCreated): void {}

export function handleGlobalItemRegistryStored(event: GlobalItemRegistryStored): void {}

export function handleGameManagerSet(event: GameManagerSet): void {}

export function handleGameUriUpdated(event: GameUriUpdated): void {}

export function handleItemCreated(event: ItemCreated): void {}

export function handleItemBatchCreated(event: ItemBatchCreated): void {}

export function handleItemSupplyChanged(event: ItemSupplyChanged): void {}

export function handleItemBatchSupplyChanged(event: ItemBatchSupplyChanged): void {}
