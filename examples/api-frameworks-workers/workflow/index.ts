import {
  registerFunction,
  call,
  registerTrigger,
  enqueue, // formerly emit
  state,
  getContext,
  type ApiRequest,
  type ApiResponse,
} from "./iii-client";
import type { CreateOrderInput, OrderState } from "./types";

const createOrder = async (
  req: ApiRequest<CreateOrderInput>
): Promise<ApiResponse> => {
  const { logger } = getContext();
  const { userId, productId, quantity } = req.body;

  const orderId = crypto.randomUUID();
  const now = Date.now();

  const orderState: OrderState = {
    orderId,
    userId,
    productId,
    quantity,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };

  logger.info("Creating order", { orderId, userId, productId, quantity });

  await state.set("orders", orderId, orderState);
  await enqueue("order.requested", { orderId });

  logger.info("Order created, processing async", { orderId });

  return {
    status_code: 202,
    body: { orderId, status: "pending", message: "Order is being processed" },
  };
};

const getOrder = async (req: ApiRequest): Promise<ApiResponse> => {
  const orderId = req.path_params.orderId;

  const order = await state.get("orders", orderId);
  if (!order) {
    return { status_code: 404, body: { error: "Order not found" } };
  }

  return { status_code: 200, body: order };
};

// Would suggest putting the function argument first and config object last
registerFunction({ id: "workers::workflow::createOrder" }, createOrder);
const func1 = registerFunction({ id: "workers::workflow::getOrder" }, getOrder);

const exposedInternalFunctionWithinThisDomain = {
  api_path: "order/:orderId",
  http_method: "GET",
  function_id: func1.id, // reference is the string "workers::workflow::getOrder"
};

const triggerRef = registerTrigger(exposedInternalFunctionWithinThisDomain);

const exposedInternalFunctionInAnotherLanguageOnAnotherWorker = {
  api_path: "order/:orderId",
  http_method: "GET",
  function: "workers::workflow::getOrder",
};

const externalFunction = {
  type: "function",
  api_path: "https://stripe.com/api/v2/order/:orderId",
  http_method: "GET",
  target_id: "externalWorker::stripe::getOrder",
};

// Simplified a bit
// Changing function_path to something that doesn't have the ambiguity of "path"
// id is pretty generic but luckily doesn't have a strong meaning
// Someone could see it as path notation, or as just a string with a user-preferred structure
// id shouldn't have a iii-enforced structure, that would be for frameworks to decide

registerTrigger({
  type: "http",
  function_id: "workers::workflow::createOrder",
  config: {
    path: "/order", // Paths should start with /
    http_method: "POST",
    // May need a schema for request/response?
  },
});

registerTrigger({
  type: "http",
  target_id: "workers::workflow::getOrder",
  config: {
    path: "/order/:orderId",
    http_method: "GET",
    // May need a schema for request/response?
  },
});

console.log(
  "[Workflow] POST /order - Creates order and emits order.requested event"
);
console.log("[Workflow] GET /order/:orderId - Query order status from state");
