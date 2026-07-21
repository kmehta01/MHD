const groupNames = ["assistance", "contactPreferences", "submissionChannels", "accommodations"];

export const normalizeGrievanceFormOptions = (formOptions = {}) => Object.fromEntries(
  groupNames.map((group) => [group, (formOptions[group] || []).filter((item) => item.isActive !== false)]),
);

export const reconcileGrievanceFormSelections = (form, formOptions = {}) => {
  const options = normalizeGrievanceFormOptions(formOptions);
  const enabled = (group) => new Set(options[group].map((item) => item.key));
  return {
    ...form,
    assistance: (form.assistance || []).filter((key) => enabled("assistance").has(key)),
    channel: (form.channel || []).filter((key) => enabled("submissionChannels").has(key)),
    accommodation: (form.accommodation || []).filter((key) => enabled("accommodations").has(key)),
    contact_pref: enabled("contactPreferences").has(form.contact_pref) ? form.contact_pref : "",
  };
};

export const hasRequiredGrievanceFormOptions = (formOptions = {}) => {
  const options = normalizeGrievanceFormOptions(formOptions);
  return options.contactPreferences.length > 0 && options.submissionChannels.length > 0;
};
