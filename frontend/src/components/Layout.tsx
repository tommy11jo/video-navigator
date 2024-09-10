import { Outlet, Link } from "react-router-dom"
function Layout() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 pt-4">
        <div className="flex flex-col mb-4">
          <Link to="/" className="text-lg font-bold hover:text-gray-300 mb-2">
            Youtube Video Navigator
          </Link>
          <div className="text-sm text-gray-400">
            <p>
              <span className="font-bold text-white">Problem:</span> Videos are
              hard to skim, navigate, and quickly understand as a whole.
            </p>
            <p>
              <span className="font-bold text-white">Solution:</span> Navigate a
              video using an overview of its content.
            </p>
          </div>
        </div>
        <hr className="border-t border-gray-700 w-full mb-8" />
        <Outlet />
      </div>
    </div>
  )
}

export default Layout
