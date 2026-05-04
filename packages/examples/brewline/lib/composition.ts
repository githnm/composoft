import type { Composition } from "@composoft/runtime";

export const composition: Composition = {
  "name": "brewline-ops",
  "version": "0.1.0",
  "pages": [
    {
      "path": "/",
      "title": "Operations",
      "subtitle": "Roastery inventory health and procurement at a glance.",
      "blocks": [
        {
          "id": "ops.kpi-cards",
          "instanceId": "kpis",
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
          "instanceId": "low-stock",
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
          "instanceId": "inventory",
          "config": {
            "warehouseId": "wh_oakland",
            "columns": [
              "name",
              "sku",
              "category",
              "onHand",
              "reorderPoint",
              "vendor",
              "lowStock"
            ],
            "pageSize": 50
          },
          "layout": {
            "region": "main"
          }
        },
        {
          "id": "ops.item-detail-sidebar",
          "instanceId": "item-detail",
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
      "title": "Purchase orders",
      "subtitle": "Draft purchase orders awaiting approval.",
      "blocks": [
        {
          "id": "ops.po-list",
          "instanceId": "po-list",
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
      "title": "Purchase order",
      "subtitle": "Review line items and approve or receive shipment.",
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
          "instanceId": "vendor-sidebar",
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
