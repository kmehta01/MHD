import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import About from "./pages/About";
import Leadership from "./pages/Leadership";
import Departments from "./pages/Departments";
import SubmitComplaint from "./pages/SubmitComplaint";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about-us" element={<About />} />
        <Route path="/leadership" element={<Leadership />} />
        <Route path="/departments" element={<Departments />} />
        <Route path="/submit-complaint" element={<SubmitComplaint />} />
      </Route>
    </Routes>
  );
}

export default App;
