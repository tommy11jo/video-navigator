import { useState } from "react"
import { formatTime } from "../utils/formatTime"
import YouTubeEmbed from "./VideoEmbed"
import { useParams } from "react-router-dom"

const VideoPage = () => {
  const { videoId } = useParams<{ videoId: string }>()

  const [currentTimeInS, setCurrentTimeInS] = useState(0)
  const [seekTimeInS, setSeekTimeInS] = useState(-1)

  const timeList = Array.from({ length: 10 }, (_, i) => i * 30)
  return (
    <div>
      <h1 className="text-3xl font-bold underline">Hello world!</h1>
      <p>Current Video ID: {videoId}</p>
      <YouTubeEmbed
        videoId={videoId!}
        setCurrentTimeInS={setCurrentTimeInS}
        seekTimeInS={seekTimeInS}
        key={videoId}
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
    </div>
  )
}

export default VideoPage
