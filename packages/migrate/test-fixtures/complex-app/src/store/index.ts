import { configureStore } from "@reduxjs/toolkit";

// Stub — analyzer should detect Redux usage and add a limitation.
export const store = configureStore({
  reducer: {
    deals: (state: { items: unknown[] } = { items: [] }) => state,
  },
});
