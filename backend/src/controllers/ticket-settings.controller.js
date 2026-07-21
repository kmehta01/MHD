const TicketSettingsService = require("../services/ticket-settings.service");

const capabilities = (user) => ({
  can_update: user.role_slug === "super-admin",
  can_reset: user.role_slug === "super-admin",
  can_view_history: user.role_slug === "super-admin" || user.permissions?.includes("settings.ticket_number.history"),
  read_only: user.role_slug !== "super-admin",
});

const sendError = (res, error, fallback) => res.status(error.statusCode || 500).json({
  status: false,
  success: false,
  message: error.statusCode ? error.message : fallback,
  errors: error.errors,
  code: error.code,
  error: process.env.NODE_ENV === "development" && !error.statusCode ? error.message : undefined,
});

const getTicketSettings = async (req, res) => {
  try {
    const data = await TicketSettingsService.getSettings();
    return res.json({ success: true, status: true, data, meta: { capabilities: capabilities(req.user) } });
  } catch (error) { return sendError(res, error, "Failed to fetch Ticket Number Format settings"); }
};

const previewTicketSettings = async (req, res) => {
  try {
    const data = await TicketSettingsService.preview(req.ticketPreviewSettings);
    return res.json({ success: true, status: true, data });
  } catch (error) { return sendError(res, error, "Failed to preview the ticket number"); }
};

const updateTicketSettings = async (req, res) => {
  try {
    const result = await TicketSettingsService.updateSettings({
      settings: req.validatedTicketSettings, req, reason: req.ticketSettingsReason,
    });
    return res.json({
      success: true, status: true,
      message: result.changes.length ? "Ticket Number Format settings updated successfully" : "No setting values changed",
      data: result.data, preview: result.preview, changedSettings: result.changes,
      warnings: result.warnings,
      meta: { capabilities: capabilities(req.user) },
    });
  } catch (error) { return sendError(res, error, "Failed to update Ticket Number Format settings"); }
};

const resetTicketSequence = async (req, res) => {
  try {
    const result = await TicketSettingsService.resetSequence({
      newStartingSequence: req.ticketSequenceReset.newStartingSequence,
      reason: req.ticketSequenceReset.reason,
      req,
    });
    return res.json({
      success: true, status: true,
      message: "Ticket sequence reset successfully. Existing ticket numbers were not changed.",
      data: result.data, nextTicket: result.nextTicket,
    });
  } catch (error) { return sendError(res, error, "Failed to reset the ticket sequence"); }
};

const getTicketSettingsHistory = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const perPage = Math.min(100, Math.max(1, Number.parseInt(req.query.perPage, 10) || 20));
    const filters = {
      dateFrom: req.query.dateFrom || null, dateTo: req.query.dateTo || null,
      changedBy: req.query.changedBy ? Number(req.query.changedBy) : null,
      changeType: req.query.changeType || null, settingKey: req.query.settingKey || null,
      limit: perPage, offset: (page - 1) * perPage,
    };
    const result = await TicketSettingsService.getHistory(filters);
    return res.json({
      success: true, status: true, data: result.rows,
      meta: { page, perPage, total: result.total, totalPages: Math.max(1, Math.ceil(result.total / perPage)) },
    });
  } catch (error) { return sendError(res, error, "Failed to fetch Ticket Number Format history"); }
};

module.exports = { getTicketSettings, getTicketSettingsHistory, previewTicketSettings, resetTicketSequence, updateTicketSettings };
