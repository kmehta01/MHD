import { Link } from "react-router-dom";
import Icon from "../components/Icon";

const Unauthorized = () => (
  <div className="module-page">
    <section className="panel module-empty-state">
      <div className="empty-state-icon">
        <Icon name="lock" size={29} />
      </div>
      <h1>Access Restricted</h1>
      <p>
        Your current role does not include permission to open this module.
        Contact a Super Admin if your responsibilities require access.
      </p>
      <Link className="button button-primary" to="/profile">
        Go to My Profile
      </Link>
    </section>
  </div>
);

export default Unauthorized;
