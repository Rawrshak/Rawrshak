import { ByteArray, BigInt, crypto } from "@graphprotocol/graph-ts"
import { CraftingContractCreated } from "../generated/CraftingFactory/CraftingFactory"
import { OVCToken } from "../generated/templates/Crafting/OVCToken"
import {
  ItemCrafted,
  RecipeCreated,
  RecipeMaterialsUpdated,
  RecipeRewardsUpdated,
  RecipeActiveSet,
  RecipeCostUpdated,
} from "../generated/templates/Crafting/Crafting"

import { Crafting as CraftingContract } from "../generated/templates"
import { Recipe, RecipeEntry } from "../generated/schema"
import { Address } from "@graphprotocol/graph-ts/index";

export function handleCraftingContractCreated(event: CraftingContractCreated): void {
  // Start indexing events from CraftingContract address 
  CraftingContract.create(event.params.addr);
}

export function handleRecipeCreated(event: RecipeCreated): void {  
  // let id = ByteArray.fromHexString(event.params.id.toHexString());
  // let recipeId = ByteArray.fromHexString(event.params.recipeId.toHexString());

  let id = ByteArray.fromI32(event.params.id.toI32());
  let recipeId = ByteArray.fromI32(event.params.recipeId.toI32());
  let hashId =  crypto.keccak256(concat(id, recipeId)).toHex();
  let recipe = new Recipe(hashId);
  recipe.contractId = event.params.id;
  recipe.recipeId = event.params.recipeId;
  recipe.isActive = false;
  recipe.cost = BigInt.fromI32(0);
  recipe.craftedCount = BigInt.fromI32(0);
  recipe.save();
}

export function handleRecipeMaterialsUpdated(event: RecipeMaterialsUpdated): void {
  // (uint256 id, uint256 recipeId, uint256[] materialIds, uint256[] amounts);
  let materialIds = event.params.materialIds;
  let amounts = event.params.amounts;
  let id = ByteArray.fromI32(event.params.id.toI32());
  let recipeId = ByteArray.fromI32(event.params.recipeId.toI32());
  let recipeIdByteArray = crypto.keccak256(concat(id, recipeId));
  for (let index = 0, length = materialIds.length; index < length; ++index) {
    // operator, from, to, id, value
    let materialId = crypto.keccak256(concat(recipeIdByteArray, ByteArray.fromHexString(materialIds[index].toHexString()))).toHex();
    let materialItem = RecipeEntry.load(materialId);
    if (materialItem == null) {
      materialItem = new RecipeEntry(materialId);
    }
    materialItem.recipe = recipeIdByteArray.toHex();
    materialItem.item = materialIds[index].toHex();
    materialItem.amount = amounts[index];
    materialItem.isMaterial = true;
    materialItem.save();
  }
}

export function handleRecipeRewardsUpdated(event: RecipeRewardsUpdated): void {
  // (uint256 id, uint256 recipeId, uint256[] materialIds, uint256[] amounts);
  let rewardsId = event.params.rewardsId;
  let amounts = event.params.amounts;
  let id = ByteArray.fromI32(event.params.id.toI32());
  let recipeId = ByteArray.fromI32(event.params.recipeId.toI32());
  let recipeIdByteArray = crypto.keccak256(concat(id, recipeId));
  for (let index = 0, length = rewardsId.length; index < length; ++index) {
    // operator, from, to, id, value
    let rewardId = crypto.keccak256(concat(recipeIdByteArray, ByteArray.fromHexString(rewardsId[index].toHexString()))).toHex();
    let rewardItem = new RecipeEntry(rewardId);
    if (rewardItem == null) {
      rewardItem = new RecipeEntry(rewardId);
    }
    rewardItem.recipe = recipeIdByteArray.toHex();
    rewardItem.item = rewardsId[index].toHex();
    rewardItem.amount = amounts[index];
    rewardItem.isMaterial = false;
    rewardItem.save();
  }
}

export function handleRecipeActiveSet(event: RecipeActiveSet): void {
  // uint256 id, uint256 recipeId, bool isActive
  let id = ByteArray.fromI32(event.params.id.toI32());
  let recipeId = ByteArray.fromI32(event.params.recipeId.toI32());
  let hashId =  crypto.keccak256(concat(id, recipeId)).toHex();
  let recipe = Recipe.load(hashId);
  if (recipe != null) {
    recipe.isActive = event.params.isActive;
    recipe.save();
  }
}

export function handleRecipeCostUpdated(event: RecipeCostUpdated): void {
  // uint256 id, uint256 recipeId, address tokenAddress, uint256 cost
  let id = ByteArray.fromI32(event.params.id.toI32());
  let recipeId = ByteArray.fromI32(event.params.recipeId.toI32());
  let hashId =  crypto.keccak256(concat(id, recipeId)).toHex();
  let recipe = Recipe.load(hashId);
  if (recipe != null) {
    let tokenContract = OVCToken.bind(event.params.tokenAddress);
    recipe.token = tokenContract.tokenId().toHex();
    recipe.cost = event.params.cost;
    recipe.save();
  }
}

export function handleItemCrafted(event: ItemCrafted): void {
  // uint256 id, uint256 recipeId, address owner
  let id = ByteArray.fromI32(event.params.id.toI32());
  let recipeId = ByteArray.fromI32(event.params.recipeId.toI32());
  let hashId =  crypto.keccak256(concat(id, recipeId)).toHex();
  let recipe = Recipe.load(hashId);
  if (recipe != null) {
    recipe.craftedCount = recipe.craftedCount.plus(BigInt.fromI32(1));
    recipe.save();
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
