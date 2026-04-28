import type { Composition } from "@composoft/runtime";

export const composition: Composition = {
  "name": "brandx-support",
  "version": "0.1.0",
  "pages": [
    {
      "path": "/",
      "blocks": [
        {
          "id": "support.ticket-list",
          "instanceId": "open-tickets",
          "config": {
            "columns": [
              "vipFlag",
              "subject",
              "customer",
              "status",
              "priority",
              "lastActivity"
            ],
            "pageSize": 25,
            "defaultStatus": "open"
          },
          "layout": {
            "region": "main"
          }
        },
        {
          "id": "support.escalation-queue",
          "instanceId": "senior-queue",
          "config": {
            "pageSize": 10,
            "sortBy": "priority"
          },
          "layout": {
            "region": "sidebar"
          }
        }
      ]
    },
    {
      "path": "/tickets/[ticketId]",
      "blocks": [
        {
          "id": "support.conversation-view",
          "instanceId": "ticket-conversation",
          "config": {
            "showSystemMessages": true,
            "groupByDay": true
          },
          "layout": {
            "region": "main"
          }
        },
        {
          "id": "support.agent-handoff-panel",
          "instanceId": "handoff-panel",
          "config": {
            "showSeniorQueueOnly": false,
            "agents": [
              {
                "id": "agent-1",
                "name": "Alex Junior",
                "isSenior": false
              },
              {
                "id": "agent-2",
                "name": "Bailey Mid",
                "isSenior": false
              },
              {
                "id": "agent-3",
                "name": "Casey Senior",
                "isSenior": true
              },
              {
                "id": "agent-4",
                "name": "Dana Senior",
                "isSenior": true
              }
            ]
          },
          "layout": {
            "region": "main"
          }
        },
        {
          "id": "support.customer-sidebar",
          "instanceId": "customer-context",
          "config": {
            "sections": [
              "vipBadge",
              "contactInfo",
              "tags",
              "recentTickets"
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
