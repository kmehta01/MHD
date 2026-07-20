import { useEffect, useMemo, useState } from "react";
import Icon from "../components/Icon";
import API from "../services/api";

const emptyPasswordForm = {
  current_password: "",
  new_password: "",
  confirm_password: "",
};

const getInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "AD";

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
          <div className="profile-avatar-xl">{getInitials(user?.name)}</div>
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
    </div>
  );
};

export default Profile;
