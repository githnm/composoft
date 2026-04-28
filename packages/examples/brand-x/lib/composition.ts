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
            "region": "main"
          }
        }
      ]
    },
    {
      "path": "/tickets/[ticketId]",
      "blocks": [
        {
          "id": "support.conversation-view",
          "instanceId": "ticket-thread",
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
          "instanceId": "handoff",
          "config": {
            "showSeniorQueueOnly": false,
            "agents": [
              {
                "id": "agent-1",
                "name": "Alex Chen",
                "isSenior": false
              },
              {
                "id": "agent-2",
                "name": "Jordan Patel",
                "isSenior": false
              },
              {
                "id": "agent-senior-1",
                "name": "Morgan Reyes",
                "isSenior": true
              },
              {
                "id": "agent-senior-2",
                "name": "Sam Okafor",
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
