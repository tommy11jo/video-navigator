import { useEffect, useState } from "react"
import YouTubeEmbed from "./VideoEmbed"
import { useParams } from "react-router-dom"
import axios from "axios"
import { DateTime } from "luxon"
import "../styles/custom-scrollbar.css"

export interface VideoOverview {
  chapters: Chapter[]
  video_title: string
  published_iso: string
  duration_iso: string
  channel_title: string
}

export interface Chapter {
  title: string
  key_points: KeyPoint[]
  associations: string[]
}

export interface KeyPoint {
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
        `${import.meta.env.VITE_API_URL}/get-overview/${videoId}`
      )
      setVideoOverview(response.data)
    }
    fetchVideoData()
  }, [videoId])

  useEffect(() => {
    if (!videoOverview) return
    const chapterIndex = videoOverview.chapters.findIndex((chapter, index) => {
      const currentChapterStart = chapter.key_points[0]?.time ?? 0
      const nextChapterStart =
        videoOverview.chapters[index + 1]?.key_points[0]?.time ?? Infinity
      return (
        currentTimeInS >= currentChapterStart &&
        currentTimeInS < nextChapterStart
      )
    })
    setCurrentChapterIndex(
      chapterIndex !== -1 ? chapterIndex : videoOverview.chapters.length - 1
    )
  }, [currentTimeInS, videoOverview])

  const handleKeyPointClick = (time: number) => {
    setSeekTimeInS(time)
  }

  if (!videoOverview || !videoOverview.chapters)
    return <div>Loading video overview...</div>
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
          <span className="text-lg font-bold">{videoOverview.video_title}</span>
          <div className="flex flex-row justify-between text-sm">
            {videoOverview.channel_title && (
              <span className="block mt-2">{videoOverview.channel_title}</span>
            )}
            {videoOverview.published_iso && (
              <span className="block mt-2">
                {DateTime.fromISO(videoOverview.published_iso).toLocaleString(
                  DateTime.DATE_FULL
                )}
              </span>
            )}
          </div>
          <div className="flex flex-col text-sm">
            {videoId && (
              <div className="mt-2">
                <a
                  href={`https://www.youtube.com/watch?v=${videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  See on YouTube
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="w-full md:w-1/2 p-2 overflow-auto h-[80svh] border-2 border-gray-700 rounded-lg text-sm custom-scrollbar">
        <div>
          {videoOverview.chapters.map((chapter: Chapter, index: number) => (
            <div
              key={index}
              className={`text-sm ${
                index === currentChapterIndex ? "bg-gray-800 rounded-lg" : ""
              }`}
            >
              <div className="p-1">
                <h3 className="text-lg font-semibold mb-2 flex items-center">
                  <span
                    className="cursor-pointer mr-2 text-blue-accent hover:underline"
                    onClick={() =>
                      handleKeyPointClick(chapter.key_points[0].time)
                    }
                  >
                    {chapter.title}
                  </span>
                </h3>
                <div className="flex flex-wrap gap-2 mt-1">
                  {chapter.associations.map(
                    (association: string, associationIndex: number) => (
                      <span
                        key={associationIndex}
                        className="px-2 py-1 bg-gray-700 text-white text-xs rounded-full"
                      >
                        {association}
                      </span>
                    )
                  )}
                </div>
                <div className="m-2">
                  <ul className="list-disc pl-5">
                    {chapter.key_points.map(
                      (keyPoint: KeyPoint, pointIndex: number) => (
                        <li key={pointIndex}>
                          <span
                            className="cursor-pointer text-gray-300 hover:text-white hover:underline"
                            onClick={() => handleKeyPointClick(keyPoint.time)}
                          >
                            {keyPoint.text}
                          </span>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default VideoPage
