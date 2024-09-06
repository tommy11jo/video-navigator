import React, { useEffect, useRef } from "react"
import Plyr from "plyr"
import "plyr/dist/plyr.css"
import "../styles/plyr.css"

interface YouTubeEmbedProps {
  videoId: string
  seekTimeInS: number
  setCurrentTimeInS: (time: number) => void
  width?: number
  height?: number
}

const YouTubeEmbed: React.FC<YouTubeEmbedProps> = ({
  videoId,
  seekTimeInS,
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
    if (!playerRef.current) return

    const updateVideoProgress = (progressPercentage: number) => {
      progressPercentage = Math.max(0, Math.min(100, progressPercentage))
      const seekInput = document.querySelector(
        'input[data-plyr="seek"]'
      ) as HTMLInputElement
      if (seekInput) {
        seekInput.value = progressPercentage.toString()
        const progressBar = seekInput.nextElementSibling as HTMLProgressElement
        if (
          progressBar &&
          progressBar.classList.contains("plyr__progress__buffer")
        ) {
          progressBar.value = progressPercentage
        }
        seekInput.dispatchEvent(new Event("input", { bubbles: true }))
      }
    }

    const totalDuration = playerRef.current.duration || 0
    const progressPercentage = (seekTimeInS / totalDuration) * 100

    updateVideoProgress(progressPercentage)

    // Use a setTimeout to ensure the progress update has been applied
    setTimeout(() => {
      if (playerRef.current) {
        playerRef.current.currentTime = seekTimeInS
        setCurrentTimeInS(seekTimeInS)
      }
    }, 50)
  }, [seekTimeInS, setCurrentTimeInS])

  useEffect(() => {
    if (!playerRef.current) return

    const updateVideoProgress = (progressPercentage: number) => {
      progressPercentage = Math.max(0, Math.min(100, progressPercentage))
      const seekInput = document.querySelector(
        'input[data-plyr="seek"]'
      ) as HTMLInputElement
      if (seekInput) {
        seekInput.value = progressPercentage.toString()
        seekInput.dispatchEvent(new Event("input", { bubbles: true }))
      } else {
        console.error("No seek input found")
      }
    }

    const totalDuration = playerRef.current.duration
    const progressPercentage = (seekTimeInS / totalDuration) * 100

    updateVideoProgress(progressPercentage)

    // Use a setTimeout to ensure the progress update has been applied
    setTimeout(() => {
      if (playerRef.current) {
        playerRef.current.currentTime = seekTimeInS
        setCurrentTimeInS(seekTimeInS)
      }
    }, 50)
  }, [seekTimeInS, setCurrentTimeInS])

  useEffect(() => {
    if (containerRef.current && !playerRef.current) {
      playerRef.current = new Plyr(containerRef.current, {
        provider: "youtube",
        youtubeId: videoId,
        keyboard: {
          global: true,
        },
      })

      playerRef.current.on("timeupdate", () => {
        if (playerRef.current) {
          setCurrentTimeInS(playerRef.current.currentTime)
        }
      })
      playerRef.current.on("seeking", () => {
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
