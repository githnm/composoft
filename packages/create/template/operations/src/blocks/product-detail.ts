import { defineBlock } from "@composoft/spec";
import { configSchema, type Actions, type Data } from "./product-detail-types.js";
import { ProductDetail } from "./product-detail.component.js";

export const productDetailBlock = defineBlock<typeof configSchema, Data, Actions>({
  id: "inventory.product-detail",
  version: "0.1.0",
  description:
    "Sidebar block. Reads `selection.productId` from page state and shows the product's master fields, per-location stock breakdown, and quick adjust/transfer actions.",
  config: configSchema,
  data: {
    product: {
      adapter: "products.by-id",
      params: {
        productId: { kind: "from-page-state", path: "selection.productId" },
      },
    },
    stock: {
      adapter: "stock-levels.by-product",
      params: {
        productId: { kind: "from-page-state", path: "selection.productId" },
      },
    },
  },
  actions: {
    adjust: {
      workflow: "stock.adjust",
      params: {
        productId: { kind: "from-page-state", path: "selection.productId" },
      },
    },
    transfer: {
      workflow: "stock.transfer",
      params: {
        productId: { kind: "from-page-state", path: "selection.productId" },
      },
    },
  },
  component: ProductDetail,
});
