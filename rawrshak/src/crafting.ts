import { ByteArray, BigInt, crypto } from "@graphprotocol/graph-ts"
import { OVCToken } from "../generated/OVCToken/OVCToken"
import {
  ItemCrafted,
  RecipeCreated,
  RecipeMaterialsUpdated,
  RecipeRewardsUpdated,
  RecipeActiveSet,
  RecipeCostUpdated,
} from "../generated/templates/Crafting/Crafting"

import { Recipe, RecipeEntry } from "../generated/schema"
import {Address} from "@graphprotocol/graph-ts/index";

// Todo: remove when finished. Not completely sure if this is needed yet
// import { CraftingContractCreated } from "../generated/CraftingFactory/CraftingFactory"
// import { CraftingManager } from "../generated/templates/CraftingManager/CraftingManager"

export function handleRecipeCreated(event: RecipeCreated): void {
  // uint256 id, uint256 recipeId
  let id =  crypto.keccak256(concat(event.params.id.toI32(), event.params.recipeId.toI32())).toHexString();
  let recipe = new Recipe(id);
  recipe.contractId = event.params.id;
  recipe.recipeId = event.params.recipeId;
  recipe.isActive = false;
  recipe.cost = BigInt.fromI32(0);
  recipe.craftedCount = BigInt.fromI32(0);
  recipe.save();
}

export function handleRecipeMaterialsUpdated(event: RecipeMaterialsUpdated): void {
  // (uint256 id, uint256 recipeId, uint256[] materialIds, uint256[] amounts);
  for (let index = 0, length = event.params.materialIds.length; index < length; ++index) {
    // operator, from, to, id, value
    let recipeIdByteArray = crypto.keccak256(concat(event.params.id.toI32(), event.params.recipeId.toI32()));
    let recipeIdString = recipeIdByteArray.toHexString();
    let materialId = crypto.keccak256(concat(recipeIdByteArray, event.params.materialIds[index].toI32())).toHexString();
    let materialItem = new RecipeEntry(materialId);
    materialItem.recipe = recipeIdString;
    materialItem.item = event.params.materialIds[index].toHex();
    materialItem.amount = event.params.amounts[index];
    materialItem.isMaterial = true;
    materialItem.save();
  }
}

export function handleRecipeRewardsUpdated(event: RecipeRewardsUpdated): void {
  // (uint256 id, uint256 recipeId, uint256[] materialIds, uint256[] amounts);
  for (let index = 0, length = event.params.rewardsId.length; index < length; ++index) {
    // operator, from, to, id, value
    let recipeIdByteArray = crypto.keccak256(concat(event.params.id.toI32(), event.params.recipeId.toI32()));
    let recipeIdString = recipeIdByteArray.toHexString();
    let rewardId = crypto.keccak256(concat(recipeIdByteArray, event.params.rewardsId[index].toI32())).toHexString();
    let rewardItem = new RecipeEntry(rewardId);
    rewardItem.recipe = recipeIdString;
    rewardItem.item = event.params.rewardsId[index].toHex();
    rewardItem.amount = event.params.amounts[index];
    rewardItem.isMaterial = false;
    rewardItem.save();
  }
}

export function handleRecipeActiveSet(event: RecipeActiveSet): void {
  // uint256 id, uint256 recipeId, bool isActive
  let id =  crypto.keccak256(concat(event.params.id.toI32(), event.params.recipeId.toI32())).toHexString();
  let recipe = Recipe.load(id);
  if (recipe != null) {
    recipe.isActive = event.params.isActive;
    recipe.save();
  }
}

export function handleRecipeCostUpdated(event: RecipeCostUpdated): void {
  // uint256 id, uint256 recipeId, address tokenAddress, uint256 cost
  let id =  crypto.keccak256(concat(event.params.id.toI32(), event.params.recipeId.toI32())).toHexString();
  let recipe = Recipe.load(id);
  if (recipe != null) {
    let tokenContract = OVCToken.bind(event.address);
    recipe.token = tokenContract.tokenId().toHex();
    recipe.cost = event.params.cost;
    recipe.save();
  }
}

export function handleItemCrafted(event: ItemCrafted): void {
  // uint256 id, uint256 recipeId, address owner
  let id =  crypto.keccak256(concat(event.params.id.toI32(), event.params.recipeId.toI32())).toHexString();
  let recipe = Recipe.load(id);
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
