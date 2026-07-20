import { useMemo, useState } from "react";

const getInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "AD";

const resolveProfilePhotoUrl = (profilePhoto) => {
  if (!profilePhoto) return "";
  if (/^(?:https?:|data:|blob:)/i.test(profilePhoto)) return profilePhoto;

  const apiBase =
    import.meta.env.VITE_BACKEND_URL ||
    (import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api").replace(
      /\/api\/?$/,
      "",
    );

  try {
    return new URL(profilePhoto, `${apiBase.replace(/\/$/, "")}/`).toString();
  } catch {
    return profilePhoto;
  }
};

const ProfileAvatar = ({ className = "avatar", name = "", profilePhoto }) => {
  const [failedPhotoUrl, setFailedPhotoUrl] = useState("");
  const photoUrl = useMemo(
    () => resolveProfilePhotoUrl(profilePhoto),
    [profilePhoto],
  );

  return (
    <span className={className}>
      {photoUrl && failedPhotoUrl !== photoUrl ? (
        <img
          alt=""
          decoding="async"
          onError={() => setFailedPhotoUrl(photoUrl)}
          src={photoUrl}
        />
      ) : (
        getInitials(name)
      )}
    </span>
  );
};

export default ProfileAvatar;
