import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserProvider } from "./context/UserContext";
import { HomePage } from "./pages/HomePage";
import { JoinPage } from "./pages/JoinPage";
import { RoomPage } from "./pages/RoomPage";
import "./App.css";

function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/room/:id/join" element={<JoinPage />} />
          <Route path="/room/:id" element={<RoomPage />} />
        </Routes>
      </BrowserRouter>
    </UserProvider>
  );
}

export default App
