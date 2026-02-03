import { getContext } from "@iii-dev/sdk";
import { call, enqueue, register, state } from "./iii-client";
import type { OrderValidatedEvent } from "./types";

type Inventory = { id: string; quantity: number };

const checkInventory = async (event: {
  event: { data: OrderValidatedEvent };
}) => {
  const { logger } = getContext();
  const { orderId } = event.event.data;

  logger.info("Checking inventory", { orderId });

  const order = await state.get("orders", orderId);

  const inventory = await call<{ id: string }, Inventory | null>(
    "workers::koa::getInventory",
    { id: order.productId }
  );

  if (!inventory || inventory.quantity < order.quantity) {
    const availableStock = inventory?.quantity ?? 0;
    const error = `Insufficient stock: requested ${order.quantity}, available ${availableStock}`;
    logger.error("Inventory check failed", { orderId, error });

    await state.set("orders", orderId, {
      ...order,
      status: "rejected",
      error,
      availableStock,
      updatedAt: Date.now(),
    });

    return;
  }

  logger.info("Inventory available", {
    orderId,
    available: inventory.quantity,
    requested: order.quantity,
  });

  await state.set("orders", orderId, {
    ...order,
    status: "ready",
    availableStock: inventory.quantity,
    updatedAt: Date.now(),
  });

  await enqueue("order.ready", { orderId });
};

register(
  { function_id: "workers::workflow::checkInventory" },
  checkInventory
);

register({
  trigger_type: "event",
  function_id: "workers::workflow::checkInventory",
  config: {
    topic: "order.validated",
  },
});

console.log("[Workflow] checkInventory - Triggered by order.validated");
