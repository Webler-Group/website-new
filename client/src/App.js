import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./Home.js";
import MemberList from "./MemberList.js";
import Navbar from "./Navbar.js";

function App() {

  return (
    <BrowserRouter>
      <div>
        <Navbar />
        <div>
          <Routes>
            <Route exact path="/" element={<Home />}>
            </Route>
            <Route path="/members" element={<MemberList />}>
            </Route>
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
