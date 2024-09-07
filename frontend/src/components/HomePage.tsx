import { Link } from "react-router-dom"

function HomePage() {
  return (
    <div>
      <h1>Youtube Video Poster</h1>
      <div>
        <Link to="/video/uI7J3II59lc">
          <button>Example 1</button>
        </Link>
      </div>
      <div>
        <Link to="/video/VMj-3S1tku0">
          <button>Example 2</button>
        </Link>
      </div>
    </div>
  )
}

export default HomePage
