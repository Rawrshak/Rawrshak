import { ByteArray, BigInt, crypto } from "@graphprotocol/graph-ts"
import { RawrToken } from "../generated/Exchange/RawrToken"
import {
    OrderPlaced,
    OrderDeleted,
    OrderFilled,
    Claimed,
    ClaimedAll,
} from "../generated/Exchange/Exchange"
  
import { Order } from "../generated/schema"

export function handleOrderPlaced(event: OrderPlaced): void {
    let order = new Order(event.params.orderId.toHex());
    order.owner = event.params.user.toHex();
    order.item = event.params.itemId.toHex();
    let tokenContract = RawrToken.bind(event.params.token);
    order.token = tokenContract.tokenId().toHex();
    order.amountForSale = event.params.amount;
    order.amountEscrowed = BigInt.fromI32(0);
    order.amountSold = BigInt.fromI32(0);
    order.price = event.params.price;
    order.isBid = event.params.isBid;
    order.isClaimable = false;
    order.isCancelled = false;
    order.isFilled = false;
    order.createdAt = event.block.timestamp;
    order.orderFilledAt = BigInt.fromI32(0);
    order.lastClaimedAt = BigInt.fromI32(0);
    order.cancelledAt = BigInt.fromI32(0);
    order.save();
}

export function handleOrderDeleted(event: OrderDeleted): void {
    let order = Order.load(event.params.orderId.toHex());
    if (order != null) {
        order.isCancelled = true;
        order.cancelledAt = event.block.timestamp;
        order.save();
    }
}

export function handleOrderFilled(event: OrderFilled): void {
    let order = Order.load(event.params.orderId.toHex());
    if (order != null && order.isFilled == false) {
        order.amountForSale = order.amountForSale.minus(event.params.amount);
        order.amountEscrowed = order.amountEscrowed.plus(event.params.amount);
        order.amountSold = order.amountSold.plus(event.params.amount);
        order.isClaimable = true;
        if (order.amountForSale == BigInt.fromI32(0)) {
            order.isFilled = true;
            order.orderFilledAt = event.block.timestamp;
        }
        order.save();
    }
}

export function handleClaimed(event: Claimed): void {
    let order = Order.load(event.params.orderId.toHex());
    if (order != null && order.isClaimable == true) {
        order.amountEscrowed = BigInt.fromI32(0);
        order.isClaimable = false;
        order.lastClaimedAt = event.block.timestamp;
        order.save();
    }
}

export function handleClaimedAll(event: ClaimedAll): void {
    let orderIds = event.params.orderIds;
    for (let index = 0, length = orderIds.length; index < length; ++index) {
        let order = Order.load(orderIds[index].toHex());
        if (order != null && order.isClaimable == true) {
            order.amountEscrowed = BigInt.fromI32(0);
            order.isClaimable = false;
            order.lastClaimedAt = event.block.timestamp;
            order.save();
        }
    }
}
