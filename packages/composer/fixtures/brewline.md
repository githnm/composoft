# Brewline Coffee operations dashboard

Operations dashboard for Brewline Coffee, a specialty roaster.

The home page shows key metrics at the top (total SKUs, items below reorder, open purchase orders, total open spend), followed by a low-stock alerts panel grouped by vendor with one-click PO creation, and a full inventory table for the Roastery warehouse with low-stock highlighted. Clicking a row in the inventory table should show item details in a sidebar on the same page — without a navigation. The sidebar updates when the selection changes; before any selection, the sidebar shows a placeholder.

Procurement team needs a /purchase-orders page with a PO list filtered to draft POs by default, with inline approve action.

Receiving team needs a /purchase-orders/[poId] detail page showing the PO with line items, vendor info in a sidebar, and one-click approve and receive actions.
