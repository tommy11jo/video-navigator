import { BrowserRouter, Routes, Route } from "react-router-dom"
import VideoPage from "./components/VideoPage"
import HomePage from "./components/HomePage"
import Layout from "./components/Layout"
import { UserProvider } from "./components/UserContext"

function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} key="home" />
            <Route path="/video/:videoId" element={<VideoPage />} key="video" />
          </Route>
        </Routes>
      </BrowserRouter>
    </UserProvider>
  )
}

export default App
