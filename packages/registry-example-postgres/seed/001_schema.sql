-- composoft example registry: specialty coffee inventory & procurement
-- Drops and recreates everything. Idempotent for local dev.

DROP TABLE IF EXISTS po_line_items, audit_log, purchase_orders, inventory_items, vendors, warehouses CASCADE;

CREATE TABLE warehouses (
  id   text PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE vendors (
  id            text PRIMARY KEY,
  name          text NOT NULL,
  contact_email text,
  payment_terms text,
  category      text NOT NULL CHECK (category IN ('beans', 'packaging', 'equipment'))
);

CREATE TABLE inventory_items (
  id                text PRIMARY KEY,
  sku               text UNIQUE NOT NULL,
  name              text NOT NULL,
  category          text NOT NULL CHECK (category IN ('green-coffee', 'roasted', 'packaging', 'equipment')),
  warehouse_id      text NOT NULL REFERENCES warehouses(id),
  quantity_on_hand  int  NOT NULL DEFAULT 0,
  reorder_point     int  NOT NULL DEFAULT 0,
  unit_cost         numeric(10,2) NOT NULL,
  vendor_id         text NOT NULL REFERENCES vendors(id)
);

CREATE TABLE purchase_orders (
  id            text PRIMARY KEY,
  po_number     text UNIQUE NOT NULL,
  vendor_id     text NOT NULL REFERENCES vendors(id),
  status        text NOT NULL CHECK (status IN ('draft', 'approved', 'received', 'partial')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  approved_at   timestamptz,
  received_at   timestamptz,
  total_amount  numeric(12,2) NOT NULL,
  currency      text NOT NULL DEFAULT 'USD'
);

CREATE TABLE po_line_items (
  id        serial PRIMARY KEY,
  po_id     text NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_id   text NOT NULL REFERENCES inventory_items(id),
  quantity  int  NOT NULL CHECK (quantity > 0),
  unit_cost numeric(10,2) NOT NULL
);

CREATE TABLE audit_log (
  id        serial PRIMARY KEY,
  action    text NOT NULL,
  entity_id text NOT NULL,
  actor     text NOT NULL,
  details   jsonb NOT NULL,
  at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_items_warehouse ON inventory_items(warehouse_id);
CREATE INDEX idx_inventory_items_vendor    ON inventory_items(vendor_id);
CREATE INDEX idx_inventory_items_category  ON inventory_items(category);
CREATE INDEX idx_purchase_orders_status    ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_vendor    ON purchase_orders(vendor_id);
CREATE INDEX idx_audit_log_entity_action   ON audit_log(entity_id, action);
CREATE INDEX idx_po_line_items_po          ON po_line_items(po_id);
