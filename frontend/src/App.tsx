import { createBrowserRouter, RouterProvider } from "react-router-dom"
import VideoPage from "./components/VideoPage"
import HomePage from "./components/HomePage"
import Layout from "./components/Layout"
import ErrorPage from "./components/ErrorPage"
import { UserProvider } from "./components/UserContext"
import AboutPage from "./components/About"
import "./styles/main.css"

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "video/:videoId",
        element: <VideoPage />,
      },
      {
        path: "about",
        element: <AboutPage />,
      },
    ],
  },
])

function App() {
  return (
    <UserProvider>
      <RouterProvider router={router} />
    </UserProvider>
  )
}

export default App
