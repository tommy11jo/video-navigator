import React, { useEffect, useRef } from "react"
import Plyr from "plyr"
import "plyr/dist/plyr.css"
import "../styles/plyr.css"

interface YouTubeEmbedProps {
  videoId: string
  setCurrentTimeInS: (time: number) => void
  width?: number
  height?: number
}

const YouTubeEmbed: React.FC<YouTubeEmbedProps> = ({
  videoId,
  setCurrentTimeInS,
  width = 560,
  height = 315,
}) => {
  const playerRef = useRef<Plyr | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<number | null>(null)

  const clearCurrentInterval = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  useEffect(() => {
    const startTimeUpdateInterval = () => {
      clearCurrentInterval()
      intervalRef.current = window.setInterval(() => {
        if (playerRef.current) {
          const currentTime = playerRef.current.currentTime
          setCurrentTimeInS(currentTime)
        }
      }, 200)
    }

    if (containerRef.current && !playerRef.current) {
      playerRef.current = new Plyr(containerRef.current, {
        provider: "youtube",
        youtubeId: videoId,
      })

      playerRef.current.on("ready", () => {
        startTimeUpdateInterval()
      })

      playerRef.current.on("play", startTimeUpdateInterval)

      playerRef.current.on("pause", startTimeUpdateInterval)

      playerRef.current.on("seeking", () => {
        if (playerRef.current) {
          setCurrentTimeInS(playerRef.current.currentTime)
        }
      })

      playerRef.current.on("timeupdate", () => {
        if (playerRef.current) {
          setCurrentTimeInS(playerRef.current.currentTime)
        }
      })
    }

    return () => {
      clearCurrentInterval()
      if (playerRef.current) {
        playerRef.current.destroy()
      }
    }
  }, [videoId, setCurrentTimeInS])

  return (
    <div
      ref={containerRef}
      data-plyr-provider="youtube"
      data-plyr-embed-id={videoId}
      style={{ width, height }}
    ></div>
  )
}

export default YouTubeEmbed
