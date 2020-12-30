import { ByteArray, BigInt, crypto } from "@graphprotocol/graph-ts"
import { OVCToken } from "../generated/Exchange/OVCToken"
import {
    OrderPlaced,
    OrderDeleted,
    OrderFullfilled,
    Claimed,
    ClaimedAll,
} from "../generated/Exchange/Exchange"
  
import { Order } from "../generated/schema"

export function handleOrderPlaced(event: OrderPlaced): void {
    let order = new Order(event.params.orderId.toHex());
    order.owner = event.params.user.toHex();
    order.item = event.params.itemId.toHex();
    let tokenContract = OVCToken.bind(event.params.token);
    order.token = tokenContract.tokenId().toHex();
    order.amount = event.params.amount;
    order.price = event.params.price;
    order.isBid = event.params.isBid;
    order.isClaimed = false;
    order.isCancelled = false;
    order.isFullfilled = false;
    order.createdAt = event.block.timestamp;
    order.fullfilledAt = BigInt.fromI32(0);
    order.claimedAt = BigInt.fromI32(0);
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

export function handleOrderFullfilled(event: OrderFullfilled): void {
    let order = Order.load(event.params.orderId.toHex());
    if (order != null && order.isFullfilled == false) {
        order.isFullfilled = true;
        order.fullfilledAt = event.block.timestamp;
        order.save();
    }
}

export function handleClaimed(event: Claimed): void {
    let order = Order.load(event.params.orderId.toHex());
    if (order != null && order.isClaimed == false) {
        order.isClaimed = true;
        order.claimedAt = event.block.timestamp;
        order.save();
    }
}

export function handleClaimedAll(event: ClaimedAll): void {
    let orderIds = event.params.orderIds;
    for (let index = 0, length = orderIds.length; index < length; ++index) {
        let order = Order.load(orderIds[index].toHex());
        if (order != null && order.isClaimed == false) {
            order.isClaimed = true;
            order.claimedAt = event.block.timestamp;
            order.save();
        }
    }
}
