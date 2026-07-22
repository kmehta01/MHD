import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import About from "./pages/About";
import Leadership from "./pages/Leadership";
import Departments from "./pages/Departments";
import SubmitComplaint from "./pages/SubmitComplaint";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsConditions from "./pages/TermsConditions";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about-us" element={<About />} />
        <Route path="/leadership" element={<Leadership />} />
        <Route path="/departments" element={<Departments />} />
        <Route path="/submit-complaint" element={<SubmitComplaint />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-and-conditions" element={<TermsConditions />} />
      </Route>
    </Routes>
  );
}

export default App;
