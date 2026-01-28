import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import YouTubeEmbed from "./VideoEmbed"
import { useParams } from "react-router-dom"
import { DateTime } from "luxon"
import { useUser } from "./UserContext"
import OverviewContainer from "./OverviewContainer"
import TranscriptContainer from "./TranscriptContainer"
import ChatContainer from "./ChatContainer"
import { videoService } from "../services/video"
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
}

export interface KeyPoint {
  text: string
  time: number
}

export interface TranscriptEntry {
  timestamp: string
  content: string
}

export interface QuestionAnswer {
  id: string
  question: string
  answer: string
  timestamp: Date
}
const VideoPage = () => {
  const { videoId } = useParams<{ videoId: string }>()
  const { apiKey, model } = useUser()

  const [currentTimeInS, setCurrentTimeInS] = useState(0)
  const [seekTimeInS, setSeekTimeInS] = useState(-1)
  const [activeTab, setActiveTab] = useState<
    "overview" | "transcript" | "chat"
  >("overview")

  const {
    data: videoOverview,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["overview", videoId],
    queryFn: () => videoService.fetchOverview(videoId!),
    enabled: !!videoId,
  })

  const handleKeyPointClick = (time: number) => {
    setSeekTimeInS(time)
  }

  const handleTimestampClick = (timestamp: string) => {
    const [minutes, seconds] = timestamp.split(":").map(Number)
    const timeInSeconds = minutes * 60 + seconds
    setSeekTimeInS(timeInSeconds)
  }

  const handleCitationClick = (seconds: number) => {
    setSeekTimeInS(seconds)
  }

  if (!videoId) return <div>No video ID provided</div>
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
            {videoOverview?.video_title || "Loading..."}
          </span>
          <div className="flex flex-row justify-between text-sm">
            {videoOverview?.channel_title && (
              <span className="block mt-2">{videoOverview.channel_title}</span>
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

      <div className="w-full md:w-1/2 p-2">
        <div className="mb-4">
          <div className="flex border-b border-gray-700">
            <button
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "overview"
                  ? "text-blue-accent border-b-2 border-blue-accent"
                  : "text-gray-400 hover:text-white"
              }`}
              onClick={() => setActiveTab("overview")}
            >
              Video Overview
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "transcript"
                  ? "text-blue-accent border-b-2 border-blue-accent"
                  : "text-gray-400 hover:text-white"
              }`}
              onClick={() => setActiveTab("transcript")}
            >
              Transcript
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "chat"
                  ? "text-blue-accent border-b-2 border-blue-accent"
                  : "text-gray-400 hover:text-white"
              }`}
              onClick={() => setActiveTab("chat")}
            >
              Chat
            </button>
          </div>
        </div>

        <div className="overflow-auto h-[72svh] border-2 border-gray-700 rounded-lg text-sm custom-scrollbar">
          {activeTab === "overview" && (
            <OverviewContainer
              videoOverview={videoOverview}
              currentTimeInS={currentTimeInS}
              onKeyPointClick={handleKeyPointClick}
              isLoading={isLoading}
              error={error}
            />
          )}

          {activeTab === "transcript" && (
            <TranscriptContainer
              videoId={videoId}
              onTimestampClick={handleTimestampClick}
              currentTimeInS={currentTimeInS}
            />
          )}

          {activeTab === "chat" && (
            <ChatContainer
              videoId={videoId}
              apiKey={apiKey}
              model={model}
              onCitationClick={handleCitationClick}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default VideoPage
