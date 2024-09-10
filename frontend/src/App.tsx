import { BrowserRouter, Routes, Route } from "react-router-dom"
import VideoPage from "./components/VideoPage"
import HomePage from "./components/HomePage"
import Layout from "./components/Layout"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} key="home" />
          <Route path="/video/:videoId" element={<VideoPage />} key="video" />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
