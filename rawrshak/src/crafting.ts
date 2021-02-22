import { ByteArray, BigInt, crypto } from "@graphprotocol/graph-ts"
import { CraftingContractCreated } from "../generated/CraftingFactory/CraftingFactory"
import { RawrToken } from "../generated/templates/Crafting/RawrToken"
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
  let id = createRecipeId(event.params.id, event.params.recipeId);
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
  let materialIds = event.params.materialIds;
  let amounts = event.params.amounts;
  let recipeId = createRecipeId(event.params.id, event.params.recipeId);
  for (let index = 0, length = materialIds.length; index < length; ++index) {
    // operator, from, to, id, value
    let materialId = createItemId(recipeId, materialIds[index]);
    let materialItem = RecipeEntry.load(materialId);
    if (materialItem == null) {
      materialItem = new RecipeEntry(materialId);
    }
    materialItem.recipe = recipeId;
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
  let recipeId = createRecipeId(event.params.id, event.params.recipeId);
  for (let index = 0, length = rewardsId.length; index < length; ++index) {
    // operator, from, to, id, value
    let rewardId = createItemId(recipeId, rewardsId[index]);
    let rewardItem = new RecipeEntry(rewardId);
    if (rewardItem == null) {
      rewardItem = new RecipeEntry(rewardId);
    }
    rewardItem.recipe = recipeId;
    rewardItem.item = rewardsId[index].toHex();
    rewardItem.amount = amounts[index];
    rewardItem.isMaterial = false;
    rewardItem.save();
  }
}

export function handleRecipeActiveSet(event: RecipeActiveSet): void {
  // uint256 id, uint256 recipeId, bool isActive
  let recipeId = createRecipeId(event.params.id, event.params.recipeId);
  let recipe = Recipe.load(recipeId);
  if (recipe != null) {
    recipe.isActive = event.params.isActive;
    recipe.save();
  }
}

export function handleRecipeCostUpdated(event: RecipeCostUpdated): void {
  // uint256 id, uint256 recipeId, address tokenAddress, uint256 cost
  let recipeId = createRecipeId(event.params.id, event.params.recipeId);
  let recipe = Recipe.load(recipeId);
  if (recipe != null) {
    let tokenContract = RawrToken.bind(event.params.tokenAddress);
    recipe.token = tokenContract.tokenId().toHex();
    recipe.cost = event.params.cost;
    recipe.save();
  }
}

export function handleItemCrafted(event: ItemCrafted): void {
  // uint256 id, uint256 recipeId, address owner
  let recipeId = createRecipeId(event.params.id, event.params.recipeId);
  let recipe = Recipe.load(recipeId);
  if (recipe != null) {
    recipe.craftedCount = recipe.craftedCount.plus(BigInt.fromI32(1));
    recipe.save();
  }
}

function createRecipeId(gameId: BigInt, recipeId: BigInt): string {
  return gameId.toString().concat('-').concat(recipeId.toString());
}

function createItemId(recipeId: string, itemId: BigInt): string {
  return recipeId.concat('-').concat(itemId.toString());
}