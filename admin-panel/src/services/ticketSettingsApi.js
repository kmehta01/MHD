import API from "./api";

export const getTicketNumberSettings = () => API.get("/settings/ticket-number");
export const updateTicketNumberSettings = (settings, reason = "") =>
  API.put("/settings/ticket-number", { settings, reason });
export const previewTicketNumber = (settings) =>
  API.post("/settings/ticket-number/preview", { settings });
export const resetTicketSequence = (payload) =>
  API.post("/settings/ticket-number/reset-sequence", payload);
export const getTicketNumberHistory = (params) =>
  API.get("/settings/ticket-number/history", { params });
