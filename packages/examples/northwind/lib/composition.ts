import type { Composition } from "@composoft/runtime";

export const composition: Composition = {
  "name": "northwind-crm",
  "version": "0.1.0",
  "pages": [
    {
      "path": "/",
      "title": "Pipeline",
      "subtitle": "Active deals across discovery, qualified, proposal, and negotiation.",
      "blocks": [
        {
          "id": "crm.deal-pipeline",
          "instanceId": "pipeline-board",
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
        },
        {
          "id": "crm.deal-detail",
          "instanceId": "selected-deal-detail",
          "config": {
            "showActivityCount": 8
          },
          "layout": {
            "region": "sidebar"
          }
        },
        {
          "id": "crm.rep-leaderboard",
          "instanceId": "rep-leaderboard",
          "config": {
            "excludeLost": true,
            "title": "Top reps by pipeline value"
          },
          "layout": {
            "region": "sidebar"
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
      "path": "/leads",
      "title": "Leads",
      "subtitle": "Qualified inbound and outbound leads ready to convert.",
      "blocks": [
        {
          "id": "crm.lead-list",
          "instanceId": "lead-list",
          "config": {
            "defaultStatus": "qualified",
            "pageSize": 25
          },
          "layout": {
            "region": "main"
          }
        }
      ]
    }
  ]
} as const;
