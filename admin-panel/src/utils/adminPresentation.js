export const formatNavigationBadge = (value) => {
  const count = Number(value);
  if (!Number.isFinite(count) || count <= 0) return null;
  return count > 99 ? "99+" : String(Math.floor(count));
};

export const buildDashboardGreeting = (user, branding = {}) => {
  const name = user?.name || "Administrator";
  const organization = branding.organizationShortName || branding.organizationName || "";
  return `Welcome back, ${name}${organization ? ` (${organization})` : ""}`;
};
