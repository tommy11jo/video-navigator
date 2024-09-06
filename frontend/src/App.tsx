import { useState } from "react"
import YouTubeEmbed from "./components/VideoEmbed"
import { formatTime } from "./utils/formatTime"

function App() {
  const [currentTimeInS, setCurrentTimeInS] = useState(0)
  const [seekTimeInS, setSeekTimeInS] = useState(0)
  const videoId = "VMj-3S1tku0"

  const timeList = Array.from({ length: 10 }, (_, i) => i * 30)

  return (
    <>
      <h1 className="text-3xl font-bold underline">Hello world!</h1>
      <YouTubeEmbed
        videoId={videoId}
        setCurrentTimeInS={setCurrentTimeInS}
        seekTimeInS={seekTimeInS}
      />
      <div className="card">
        <div>current time is {formatTime(currentTimeInS)}</div>
        <div>Demonstration of seeking</div>
        <ul>
          {timeList.map((time) => (
            <li
              key={time}
              onClick={() => setSeekTimeInS(time)}
              className="cursor-pointer hover:text-blue-500"
            >
              {formatTime(time)}
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

export default App
