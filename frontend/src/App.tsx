import { useState } from "react"
import YouTubeEmbed from "./components/VideoEmbed"

function App() {
  const [currentTimeInS, setCurrentTimeInS] = useState(0)

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60)
    const seconds = Math.floor(timeInSeconds % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  return (
    <>
      <h1 className="text-3xl font-bold underline">Hello world!</h1>
      <YouTubeEmbed
        videoId="VMj-3S1tku0"
        setCurrentTimeInS={setCurrentTimeInS}
      />
      <div className="card">
        <div>current time is {formatTime(currentTimeInS)}</div>
      </div>
    </>
  )
}

export default App
