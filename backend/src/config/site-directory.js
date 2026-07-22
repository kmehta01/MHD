const SOCIAL_PLATFORMS = Object.freeze({
  facebook: { label: "Facebook", iconKey: "facebook_f", hosts: ["facebook.com", "www.facebook.com"] },
  x: { label: "X", iconKey: "x_twitter", hosts: ["x.com", "www.x.com", "twitter.com", "www.twitter.com"] },
  instagram: { label: "Instagram", iconKey: "instagram", hosts: ["instagram.com", "www.instagram.com"] },
  youtube: { label: "YouTube", iconKey: "youtube", hosts: ["youtube.com", "www.youtube.com", "youtu.be"] },
});

const DIRECTORY_ICONS = Object.freeze({
  building: "building",
  people_group: "people-group",
  hands_helping: "hands-helping",
  heart: "heart",
  chart_line: "chart-line",
});

const publicSocialPlatforms = () => Object.entries(SOCIAL_PLATFORMS).map(([key, item]) => ({
  key, label: item.label, iconKey: item.iconKey,
}));

const publicDirectoryIcons = () => Object.entries(DIRECTORY_ICONS).map(([key, iconName]) => ({
  key, iconName,
}));

module.exports = { DIRECTORY_ICONS, SOCIAL_PLATFORMS, publicDirectoryIcons, publicSocialPlatforms };
