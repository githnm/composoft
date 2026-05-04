import { defineBlock } from "@composoft/spec";
import { configSchema } from "./product-table-types.js";
import { ProductTable } from "./product-table.component.js";

export const productTableBlock = defineBlock({
  id: "inventory.product-table",
  version: "0.1.0",
  description:
    "Paginated product table with sortable headers and a stock-status badge (in-stock / low-stock / out-of-stock). Clicking a row writes `selection.productId` to page state.",
  config: configSchema,
  data: {
    products: {
      adapter: "products.list",
      params: {
        category: { kind: "from-config", path: "filterCategory" },
        pageSize: { kind: "from-config", path: "pageSize" },
      },
    },
    lowStock: {
      adapter: "low-stock.list",
      params: {},
    },
  },
  actions: {},
  writes: {
    selectedProduct: { kind: "page-state", path: "selection.productId" },
  },
  component: ProductTable,
});
