import { Outlet, Link } from "react-router-dom"

const Layout = () => {
  return (
    <div className="min-h-screen bg-black text-white p-2 pb-20">
      <div className="container mx-auto px-1 pt-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex flex-col">
            <Link
              to="/"
              className="text-lg font-bold hover:text-gray-300 mb-2 underline"
            >
              Youtube Video Navigator
            </Link>
            <div className="text-sm text-gray-400">
              <p>
                <span className="font-bold text-white">Problem:</span> Videos
                are hard to skim, navigate, and quickly understand as a whole.
              </p>
              <p>
                <span className="font-bold text-white">Solution:</span> Navigate
                a video using an overview of its content.
              </p>
            </div>
          </div>
          <div className="flex flex-row gap-4">
            <a
              href="https://github.com/tommy11jo/video-navigator"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-gray-300 underline"
            >
              Github
            </a>

            <Link
              to="/about"
              className="text-white hover:text-gray-300 underline"
            >
              About
            </Link>
          </div>
        </div>
        <hr className="border-t border-gray-700 w-full mb-8" />
        <Outlet />
      </div>
    </div>
  )
}

export default Layout
