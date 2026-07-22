import { useMemo, useState } from "react";
import { BACKEND_URL } from "../config/runtime-env";

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

  try {
    return new URL(profilePhoto, `${BACKEND_URL}/`).toString();
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
