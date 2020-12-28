import { ByteArray, BigInt, crypto } from "@graphprotocol/graph-ts"
import { CraftingContractCreated } from "../generated/CraftingFactory/CraftingFactory"
import { CraftingManager } from "../generated/templates/CraftingManager/CraftingManager"
import {
  CraftingManagerSet,
  ItemCrafted,
  RecipeCreated,
  RecipeMaterialsUpdated,
  RecipeRewardsUpdated,
  RecipeActiveSet,
  RecipeCostUpdated,
} from "../generated/templates/Crafting/Crafting"

import { 
  Game,
  Item,
  ItemBalance,
  Account,
  TokenBalance
 } from "../generated/schema"
 import {Address} from "@graphprotocol/graph-ts/index";

 export function handleCraftingManagerSet(event: CraftingManagerSet): void {}
 
 export function handleItemCrafted(event: ItemCrafted): void {}
 
 export function handleRecipeCreated(event: RecipeCreated): void {}
 
 export function handleRecipeMaterialsUpdated(event: RecipeMaterialsUpdated): void {}
 
 export function handleRecipeRewardsUpdated(event: RecipeRewardsUpdated): void {}
 
 export function handleRecipeActiveSet(event: RecipeActiveSet): void {}
 
 export function handleRecipeCostUpdated(event: RecipeCostUpdated): void {}