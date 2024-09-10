import { useEffect, useState } from "react"
import YouTubeEmbed from "./VideoEmbed"
import { useParams } from "react-router-dom"
import axios from "axios"
import { DateTime } from "luxon"

export interface VideoOverview {
  chapters: Chapter[]
  video_title: string
  published_iso: string
  duration_iso: string
  channel_title: string
}

export interface Chapter {
  title: string
  key_quotes: Quote[]
  key_points: string[]
}

export interface Quote {
  text: string
  time: number
}
const VideoPage = () => {
  const { videoId } = useParams<{ videoId: string }>()

  const [currentTimeInS, setCurrentTimeInS] = useState(0)
  const [seekTimeInS, setSeekTimeInS] = useState(-1)
  const [videoOverview, setVideoOverview] = useState<VideoOverview | null>(null)
  const [currentChapterIndex, setCurrentChapterIndex] = useState(-1)

  useEffect(() => {
    if (!videoId) return
    const fetchVideoData = async () => {
      const response = await axios.get<VideoOverview>(
        `http://localhost:8000/get-overview/${videoId}`
      )
      console.log(response.data)
      setVideoOverview(response.data)
    }
    fetchVideoData()
  }, [videoId])

  useEffect(() => {
    if (!videoOverview) return
    const chapterIndex = videoOverview.chapters.findIndex((chapter, index) => {
      const currentChapterStart = chapter.key_quotes[0]?.time ?? 0
      const nextChapterStart =
        videoOverview.chapters[index + 1]?.key_quotes[0]?.time ?? Infinity
      return (
        currentTimeInS >= currentChapterStart &&
        currentTimeInS < nextChapterStart
      )
    })
    setCurrentChapterIndex(
      chapterIndex !== -1 ? chapterIndex : videoOverview.chapters.length - 1
    )
  }, [currentTimeInS, videoOverview])

  const handleQuoteClick = (time: number) => {
    setSeekTimeInS(time)
  }
  console.log(
    "use the current time in s to focus on relevant chapter",
    currentTimeInS
  )

  return (
    <div className="flex flex-col md:flex-row">
      <div className="w-full md:w-1/2 p-4">
        <YouTubeEmbed
          videoId={videoId!}
          setCurrentTimeInS={setCurrentTimeInS}
          seekTimeInS={seekTimeInS}
          key={videoId}
        />
        <div className="card mt-4">
          <span className="text-lg font-bold">
            {videoOverview?.video_title}
          </span>
          <div className="flex flex-row justify-between text-sm">
            {videoOverview?.channel_title && (
              <span className="block text-blue-500 hover:underline mt-2">
                {videoOverview.channel_title}
              </span>
            )}
            {videoOverview?.published_iso && (
              <span className="block mt-2">
                {DateTime.fromISO(videoOverview.published_iso).toLocaleString(
                  DateTime.DATE_FULL
                )}
              </span>
            )}
          </div>
          <div className="flex flex-col text-sm">
            {videoId && (
              <a
                href={`https://www.youtube.com/watch?v=${videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-blue-500 hover:underline mt-2"
              >
                See on YouTube
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="w-full md:w-1/2 p-2 overflow-auto h-[80svh] border-2 border-gray-300 rounded-lg text-sm">
        {videoOverview && (
          <div>
            {videoOverview.chapters.map((chapter: Chapter, index: number) => (
              <div key={index} className="text-sm">
                <h3 className="text-lg font-semibold mb-2">
                  <span
                    className="text-blue-accent cursor-pointer hover:underline"
                    onClick={() => handleQuoteClick(chapter.key_quotes[0].time)}
                  >
                    {index === currentChapterIndex && "⭐ "}
                    {chapter.title}
                  </span>
                </h3>
                <div className="m-2">
                  <h4 className="font-semibold mt-2">Key Points:</h4>
                  <ul className="list-disc pl-5">
                    {chapter.key_points.map(
                      (point: string, pointIndex: number) => (
                        <li key={pointIndex}>{point}</li>
                      )
                    )}
                  </ul>
                  <h4 className="font-semibold mt-2">Key Quotes:</h4>
                  <ul className="list-disc pl-5">
                    {chapter.key_quotes.map(
                      (quote: Quote, quoteIndex: number) => (
                        <li key={quoteIndex}>
                          <span
                            className="text-blue-accent cursor-pointer hover:underline"
                            onClick={() => handleQuoteClick(quote.time)}
                          >
                            "{quote.text}"
                          </span>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default VideoPage
