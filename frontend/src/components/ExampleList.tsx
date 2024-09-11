import React from "react"
import { Link } from "react-router-dom"

type ExampleItem = {
  videoId: string
  title: string
}

type ExampleListProps = {
  title: string
  items: ExampleItem[]
}

const ExampleList: React.FC<ExampleListProps> = ({ title, items }) => {
  if (items.length === 0) return null

  return (
    <div className="mb-3">
      <p className="font-bold">{title}</p>
      <ul className="list-disc">
        {items.map((item) => (
          <li className="mx-2" key={item.videoId}>
            <Link
              to={`/video/${item.videoId}`}
              className="text-blue-accent hover:underline"
            >
              {item.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ExampleList
