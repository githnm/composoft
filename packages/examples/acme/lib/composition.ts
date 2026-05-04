import type { Composition } from "@composoft/runtime";

export const composition: Composition = {
  "name": "acme-sales",
  "version": "0.1.0",
  "pages": [
    {
      "path": "/",
      "title": "Pipeline",
      "subtitle": "New inbound leads and recent team activity.",
      "blocks": [
        {
          "id": "crm.lead-list",
          "instanceId": "new-leads",
          "config": {
            "defaultStatus": "new",
            "pageSize": 50
          },
          "layout": {
            "region": "main"
          }
        },
        {
          "id": "crm.activity-feed",
          "instanceId": "team-activity",
          "config": {
            "defaultType": "note",
            "showLimit": 50
          },
          "layout": {
            "region": "main"
          }
        }
      ]
    },
    {
      "path": "/pipeline",
      "title": "Deal pipeline",
      "subtitle": "Converted deals across active stages.",
      "blocks": [
        {
          "id": "crm.deal-pipeline",
          "instanceId": "deal-kanban",
          "config": {
            "stages": [
              "discovery",
              "qualified",
              "proposal",
              "negotiation"
            ],
            "title": "Pipeline"
          },
          "layout": {
            "region": "main"
          }
        }
      ]
    }
  ]
} as const;
