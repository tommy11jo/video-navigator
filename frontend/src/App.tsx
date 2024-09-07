import { BrowserRouter, Routes, Route } from "react-router-dom"
import VideoPage from "./components/VideoPage"
import HomePage from "./components/HomePage"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} key="home" />
        <Route path="/video/:videoId" element={<VideoPage />} key="video" />
      </Routes>
    </BrowserRouter>
  )
}

export default App
