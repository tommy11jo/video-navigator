import { useState } from "react"
import { Loader2 } from "lucide-react"
import { VideoOverview, Chapter, KeyPoint } from "./VideoPage"
import { formatTime } from "../utils/formatTime"

interface OverviewContainerProps {
  videoOverview: VideoOverview | null | undefined
  currentTimeInS: number
  onKeyPointClick: (time: number) => void
  isLoading?: boolean
  error?: Error | null
}

const OverviewContainer = ({
  videoOverview,
  currentTimeInS,
  onKeyPointClick,
  isLoading = false,
  error = null,
}: OverviewContainerProps) => {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(-1)

  if (isLoading) {
    return (
      <div className="p-4 text-gray-400 text-center flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading video overview...
      </div>
    )
  }

  if (error || !videoOverview || !videoOverview.chapters) {
    return (
      <div className="p-4 text-gray-400 text-center">
        Failed to load video overview
      </div>
    )
  }

  // Update current chapter based on time
  const chapterIndex = videoOverview.chapters.findIndex((chapter, index) => {
    const currentChapterStart = chapter.key_points[0]?.time ?? 0
    const nextChapterStart =
      videoOverview.chapters[index + 1]?.key_points[0]?.time ?? Infinity
    return (
      currentTimeInS >= currentChapterStart && currentTimeInS < nextChapterStart
    )
  })
  const newChapterIndex =
    chapterIndex !== -1 ? chapterIndex : videoOverview.chapters.length - 1
  if (newChapterIndex !== currentChapterIndex) {
    setCurrentChapterIndex(newChapterIndex)
  }

  return (
    <div>
      {videoOverview.chapters.map((chapter: Chapter, index: number) => (
        <div
          key={index}
          className={`text-sm relative ${
            index === currentChapterIndex ? "bg-blue-accent/10" : ""
          }`}
        >
          {index === currentChapterIndex && (
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-accent" />
          )}
          <div className="px-3 py-2">
            <h3 className="text-lg font-medium mb-1 flex items-center">
              <span
                className="cursor-pointer mr-2 text-blue-accent hover:underline"
                onClick={() => onKeyPointClick(chapter.key_points[0].time)}
              >
                {chapter.title}{" "}
                <span className="text-blue-accent font-normal">
                  ({formatTime(chapter.key_points[0].time)})
                </span>
              </span>
            </h3>
            <div className="m-1">
              <ul className="list-disc pl-2">
                {chapter.key_points.map(
                  (keyPoint: KeyPoint, pointIndex: number) => (
                    <li key={pointIndex}>
                      <span
                        className="cursor-pointer text-gray-300 hover:text-white hover:underline"
                        onClick={() => onKeyPointClick(keyPoint.time)}
                      >
                        {keyPoint.text}{" "}
                        <span className="text-gray-300">
                          ({formatTime(keyPoint.time)})
                        </span>
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
  )
}

export default OverviewContainer
