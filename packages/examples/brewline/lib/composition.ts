import type { Composition } from "@composoft/runtime";

export const composition: Composition = {
  "name": "brewline-ops",
  "version": "0.1.0",
  "pages": [
    {
      "path": "/",
      "blocks": [
        {
          "id": "ops.kpi-cards",
          "instanceId": "home-kpis",
          "config": {
            "cards": [
              "totalSkus",
              "lowStockCount",
              "openPoCount",
              "openSpend"
            ],
            "warehouseId": "wh_oakland"
          },
          "layout": {
            "region": "main"
          }
        },
        {
          "id": "ops.low-stock-alerts",
          "instanceId": "home-low-stock",
          "config": {
            "warehouseId": "wh_oakland",
            "reorderQuantityMultiplier": 2
          },
          "layout": {
            "region": "main"
          }
        },
        {
          "id": "ops.inventory-table",
          "instanceId": "home-inventory",
          "config": {
            "columns": [
              "name",
              "sku",
              "category",
              "onHand",
              "reorderPoint",
              "vendor",
              "lowStock"
            ],
            "pageSize": 50,
            "warehouseId": "wh_oakland"
          },
          "layout": {
            "region": "main"
          }
        },
        {
          "id": "ops.item-detail-sidebar",
          "instanceId": "home-item-detail",
          "config": {
            "sections": [
              "warehouse",
              "vendor",
              "stockHistory"
            ],
            "showSku": true
          },
          "layout": {
            "region": "sidebar"
          }
        }
      ]
    },
    {
      "path": "/purchase-orders",
      "blocks": [
        {
          "id": "ops.po-list",
          "instanceId": "po-list-draft",
          "config": {
            "defaultStatus": "draft",
            "columns": [
              "poNumber",
              "vendor",
              "status",
              "lineCount",
              "totalAmount",
              "createdAt"
            ],
            "pageSize": 25
          },
          "layout": {
            "region": "main"
          }
        }
      ]
    },
    {
      "path": "/purchase-orders/[poId]",
      "blocks": [
        {
          "id": "ops.po-detail",
          "instanceId": "po-detail",
          "config": {
            "showTimestamps": true
          },
          "layout": {
            "region": "main"
          }
        },
        {
          "id": "ops.vendor-sidebar",
          "instanceId": "po-vendor-sidebar",
          "config": {
            "sections": [
              "categoryBadge",
              "contactInfo",
              "paymentTerms",
              "openPos"
            ]
          },
          "layout": {
            "region": "sidebar"
          }
        }
      ]
    }
  ]
} as const;
