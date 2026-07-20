import API from "./api";

export const getGeneralSettings = () => API.get("/settings/general");

export const updateGeneralSettings = (settings, reason = "") =>
  API.put("/settings/general", { settings, reason });

export const uploadGeneralSettingsAsset = (assetType, file) => {
  const formData = new FormData();
  formData.append(assetType, file);
  return API.post(`/settings/general/${assetType}`, formData);
};

export const getGeneralSettingsHistory = () =>
  API.get("/settings/general/history", { params: { limit: 150 } });

export const resetGeneralSettings = (confirmation, reason) =>
  API.post("/settings/general/reset", { confirmation, reason });
