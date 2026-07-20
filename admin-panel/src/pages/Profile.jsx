import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "../components/Icon";
import ProfileAvatar from "../components/ProfileAvatar";
import API from "../services/api";

const MAX_PROFILE_PHOTO_BYTES = 500 * 1024;
const ACCEPTED_PROFILE_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const emptyPasswordForm = {
  current_password: "",
  new_password: "",
  confirm_password: "",
};

const formatDate = (value, fallback = "Not available") => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat("en-BZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const Profile = () => {
  const storedUser = JSON.parse(localStorage.getItem("admin_user") || "null");
  const [user, setUser] = useState(storedUser);
  const [profileForm, setProfileForm] = useState({
    name: storedUser?.name || "",
    email: storedUser?.email || "",
    phone: storedUser?.phone || "",
  });
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileNotice, setProfileNotice] = useState(null);
  const [passwordNotice, setPasswordNotice] = useState(null);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [photoDragging, setPhotoDragging] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef(null);
  const photoBrowseButtonRef = useRef(null);

  useEffect(() => {
    let active = true;

    API.get("/auth/me")
      .then((response) => {
        if (!active) return;
        const nextUser = response.data.data;
        setUser(nextUser);
        setProfileForm({
          name: nextUser.name || "",
          email: nextUser.email || "",
          phone: nextUser.phone || "",
        });
        localStorage.setItem("admin_user", JSON.stringify(nextUser));
        window.dispatchEvent(new CustomEvent("admin-user-updated", { detail: nextUser }));
      })
      .catch((error) => {
        if (!active) return;
        setProfileNotice({
          type: "error",
          text: error.response?.data?.message || "Unable to load your profile.",
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!photoModalOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !uploadingPhoto) {
        setPhotoModalOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    photoBrowseButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [photoModalOpen, uploadingPhoto]);

  useEffect(
    () => () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    },
    [photoPreview],
  );

  const passwordChecks = useMemo(
    () => [
      { label: "At least 8 characters", passed: passwordForm.new_password.length >= 8 },
      { label: "Different from current password", passed: Boolean(passwordForm.new_password) && passwordForm.new_password !== passwordForm.current_password },
      { label: "Passwords match", passed: Boolean(passwordForm.confirm_password) && passwordForm.new_password === passwordForm.confirm_password },
    ],
    [passwordForm],
  );

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((current) => ({ ...current, [name]: value }));
    setProfileNotice(null);
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((current) => ({ ...current, [name]: value }));
    setPasswordNotice(null);
  };

  const closePhotoModal = () => {
    if (uploadingPhoto) return;
    setPhotoModalOpen(false);
    setSelectedPhoto(null);
    setPhotoPreview("");
    setPhotoError("");
    setPhotoDragging(false);
  };

  const choosePhoto = (file) => {
    setPhotoError("");

    if (!file) return;
    setSelectedPhoto(null);
    setPhotoPreview("");
    if (!ACCEPTED_PROFILE_PHOTO_TYPES.has(file.type)) {
      setPhotoError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_PROFILE_PHOTO_BYTES) {
      setPhotoError("The profile picture must be 500 KB or smaller.");
      return;
    }
    if (file.size === 0) {
      setPhotoError("The selected image is empty.");
      return;
    }

    setSelectedPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handlePhotoDrop = (event) => {
    event.preventDefault();
    setPhotoDragging(false);
    choosePhoto(event.dataTransfer.files?.[0]);
  };

  const uploadProfilePhoto = async () => {
    if (!selectedPhoto) {
      setPhotoError("Choose a profile picture first.");
      return;
    }

    try {
      setUploadingPhoto(true);
      setPhotoError("");
      const formData = new FormData();
      formData.append("profile_photo", selectedPhoto);
      const response = await API.post("/auth/profile/photo", formData);
      const nextUser = response.data.data;

      setUser(nextUser);
      localStorage.setItem("admin_user", JSON.stringify(nextUser));
      window.dispatchEvent(new CustomEvent("admin-user-updated", { detail: nextUser }));
      setProfileNotice({ type: "success", text: response.data.message });
      setPhotoModalOpen(false);
      setSelectedPhoto(null);
      setPhotoPreview("");
      setPhotoDragging(false);
    } catch (error) {
      setPhotoError(
        error.response?.data?.message || "Unable to update your profile picture.",
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setProfileNotice(null);

    if (!profileForm.name.trim()) {
      setProfileNotice({ type: "error", text: "Full name is required." });
      return;
    }

    try {
      setSavingProfile(true);
      const response = await API.patch("/auth/profile", {
        name: profileForm.name.trim(),
        email: profileForm.email,
        phone: profileForm.phone.trim(),
      });
      const nextUser = response.data.data;
      setUser(nextUser);
      setProfileForm({
        name: nextUser.name || "",
        email: nextUser.email || "",
        phone: nextUser.phone || "",
      });
      localStorage.setItem("admin_user", JSON.stringify(nextUser));
      window.dispatchEvent(new CustomEvent("admin-user-updated", { detail: nextUser }));
      setProfileNotice({ type: "success", text: response.data.message });
    } catch (error) {
      setProfileNotice({
        type: "error",
        text: error.response?.data?.message || "Unable to update your profile.",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setPasswordNotice(null);

    if (passwordForm.new_password.length < 8) {
      setPasswordNotice({ type: "error", text: "New password must be at least 8 characters long." });
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordNotice({ type: "error", text: "New password and confirmation do not match." });
      return;
    }

    try {
      setSavingPassword(true);
      const response = await API.put("/auth/password", {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      setPasswordForm(emptyPasswordForm);
      setPasswordNotice({ type: "success", text: response.data.message });
    } catch (error) {
      setPasswordNotice({
        type: "error",
        text: error.response?.data?.message || "Unable to change your password.",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="profile-page">
      <header className="profile-page-header">
        <div>
          <p className="profile-eyebrow">Account</p>
          <h1>My Profile</h1>
          <p>Manage your personal information and account security.</p>
        </div>
        <span className="profile-status"><span /> Active account</span>
      </header>

      <div className="profile-layout">
        <aside className="profile-overview-card">
          <div className="profile-avatar-editor">
            <ProfileAvatar
              className="profile-avatar-xl"
              name={user?.name}
              profilePhoto={user?.profile_photo}
            />
            <button
              aria-label="Change profile picture"
              className="profile-avatar-add"
              onClick={() => setPhotoModalOpen(true)}
              title="Change profile picture"
              type="button"
            >
              <Icon name="plus" size={16} strokeWidth={2.5} />
            </button>
          </div>
          <h2>{user?.name || "Administrator"}</h2>
          <p>{user?.email || ""}</p>
          <span className="profile-role-badge">{user?.role_name || "Administrator"}</span>

          <div className="profile-overview-list">
            <div>
              <span className="profile-overview-icon"><Icon name="users" size={17} /></span>
              <span><small>Department</small><strong>{user?.department_name || "All departments"}</strong></span>
            </div>
            <div>
              <span className="profile-overview-icon"><Icon name="clock" size={17} /></span>
              <span><small>Last login</small><strong>{formatDate(user?.last_login)}</strong></span>
            </div>
            <div>
              <span className="profile-overview-icon"><Icon name="shieldCheck" size={17} /></span>
              <span><small>Two-factor authentication</small><strong>{user?.two_factor_enforced ? "Enabled" : "Not enforced"}</strong></span>
            </div>
          </div>
        </aside>

        <div className="profile-content-stack">
          <section className="profile-card">
            <div className="profile-card-heading">
              <span className="profile-card-icon"><Icon name="user" size={20} /></span>
              <div><h2>Personal information</h2><p>Update the details shown across the admin panel.</p></div>
            </div>

            {profileNotice ? <div className={`profile-notice ${profileNotice.type}`} role="status">{profileNotice.text}</div> : null}

            <form className="profile-form" onSubmit={saveProfile}>
              <label className="form-field">
                <span>Full name</span>
                <input autoComplete="name" disabled={loading} maxLength={120} name="name" onChange={handleProfileChange} placeholder="Enter your full name" value={profileForm.name} />
              </label>
              <label className="form-field">
                <span>Email address <small>Contact an administrator to change</small></span>
                <input autoComplete="email" disabled name="email" type="email" value={profileForm.email} />
              </label>
              <label className="form-field">
                <span>Phone number <small>Optional</small></span>
                <input autoComplete="tel" disabled={loading} maxLength={40} name="phone" onChange={handleProfileChange} placeholder="Enter your phone number" type="tel" value={profileForm.phone} />
              </label>
              <div className="profile-readonly-grid">
                <div><small>Role</small><strong>{user?.role_name || "—"}</strong></div>
                <div><small>Department</small><strong>{user?.department_name || "All departments"}</strong></div>
              </div>
              <div className="profile-form-actions">
                <button className="button button-primary" disabled={loading || savingProfile} type="submit">
                  <Icon name="check" size={16} /> {savingProfile ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </section>

          <section className="profile-card" id="security">
            <div className="profile-card-heading">
              <span className="profile-card-icon security"><Icon name="lock" size={20} /></span>
              <div><h2>Change password</h2><p>Use a unique password that you do not use elsewhere.</p></div>
            </div>

            {passwordNotice ? <div className={`profile-notice ${passwordNotice.type}`} role="status">{passwordNotice.text}</div> : null}

            <form className="profile-form" onSubmit={changePassword}>
              <label className="form-field">
                <span>Current password</span>
                <input autoComplete="current-password" maxLength={256} name="current_password" onChange={handlePasswordChange} required type="password" value={passwordForm.current_password} />
              </label>
              <div className="profile-password-grid">
                <label className="form-field">
                  <span>New password</span>
                  <input autoComplete="new-password" maxLength={128} minLength={8} name="new_password" onChange={handlePasswordChange} required type="password" value={passwordForm.new_password} />
                </label>
                <label className="form-field">
                  <span>Confirm new password</span>
                  <input autoComplete="new-password" maxLength={128} minLength={8} name="confirm_password" onChange={handlePasswordChange} required type="password" value={passwordForm.confirm_password} />
                </label>
              </div>
              <div className="profile-password-rules">
                {passwordChecks.map((check) => <span className={check.passed ? "passed" : ""} key={check.label}><Icon name="check" size={13} /> {check.label}</span>)}
              </div>
              <div className="profile-form-actions">
                <button className="button button-primary" disabled={savingPassword} type="submit">
                  <Icon name="lock" size={15} /> {savingPassword ? "Changing..." : "Change password"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>

      {photoModalOpen ? (
        <div className="modal-backdrop profile-photo-backdrop" onMouseDown={closePhotoModal}>
          <section
            aria-labelledby="profile-photo-title"
            aria-modal="true"
            className="profile-photo-modal"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="profile-photo-modal-header">
              <div>
                <p className="profile-eyebrow">Profile picture</p>
                <h2 id="profile-photo-title">Upload a new photo</h2>
              </div>
              <button
                aria-label="Close profile picture dialog"
                className="profile-photo-close"
                disabled={uploadingPhoto}
                onClick={closePhotoModal}
                type="button"
              >
                <Icon name="close" size={19} />
              </button>
            </div>

            <div
              className={`profile-photo-dropzone${photoDragging ? " dragging" : ""}${photoPreview ? " has-preview" : ""}`}
              onDragEnter={(event) => { event.preventDefault(); setPhotoDragging(true); }}
              onDragLeave={(event) => { event.preventDefault(); setPhotoDragging(false); }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handlePhotoDrop}
            >
              {photoPreview ? (
                <img alt="Selected profile preview" src={photoPreview} />
              ) : (
                <span className="profile-photo-upload-icon"><Icon name="arrowUp" size={23} /></span>
              )}
              <strong>{photoPreview ? selectedPhoto?.name : "Drag and drop your photo here"}</strong>
              <span>{photoPreview ? `${Math.ceil((selectedPhoto?.size || 0) / 1024)} KB selected` : "or choose a file from your device"}</span>
              <button
                className="button button-secondary"
                disabled={uploadingPhoto}
                onClick={() => photoInputRef.current?.click()}
                ref={photoBrowseButtonRef}
                type="button"
              >
                {photoPreview ? "Choose another photo" : "Browse files"}
              </button>
              <input
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => {
                  choosePhoto(event.target.files?.[0]);
                  event.target.value = "";
                }}
                ref={photoInputRef}
                type="file"
              />
            </div>

            <p className="profile-photo-help">JPG, PNG, or WebP · Maximum 500 KB</p>
            {photoError ? <div className="profile-photo-error" role="alert">{photoError}</div> : null}

            <div className="profile-photo-actions">
              <button className="button button-secondary" disabled={uploadingPhoto} onClick={closePhotoModal} type="button">Cancel</button>
              <button className="button button-primary" disabled={!selectedPhoto || uploadingPhoto} onClick={uploadProfilePhoto} type="button">
                <Icon name="check" size={16} /> {uploadingPhoto ? "Uploading..." : "Save profile picture"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
};

export default Profile;
