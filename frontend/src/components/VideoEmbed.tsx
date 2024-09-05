declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void
  }
}

import React, { useEffect, useRef, useState } from "react"

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
  const playerRef = useRef<YT.Player | null>(null)
  const [isAPIReady, setIsAPIReady] = useState(false)
  const intervalRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement("script")
      tag.src = "https://www.youtube.com/iframe_api"
      const firstScriptTag = document.getElementsByTagName("script")[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)

      window.onYouTubeIframeAPIReady = () => {
        setIsAPIReady(true)
      }
    } else {
      setIsAPIReady(true)
    }

    return () => {
      playerRef.current?.destroy()
    }
  }, [])

  useEffect(() => {
    if (isAPIReady && !playerRef.current) {
      playerRef.current = new YT.Player(`youtube-player-${videoId}`, {
        videoId: videoId,
        width: width.toString(),
        height: height.toString(),
        playerVars: {
          rel: 0,
          playsinline: 1,
        },
        events: {
          onStateChange: (event) => {
            const currentTime = event.target.getCurrentTime()

            if (event.data === YT.PlayerState.PLAYING) {
              if (intervalRef.current) {
                window.clearInterval(intervalRef.current)
              }
              intervalRef.current = window.setInterval(() => {
                setCurrentTimeInS(event.target.getCurrentTime())
              }, 200)
            } else if (event.data === YT.PlayerState.PAUSED) {
              if (intervalRef.current) {
                window.clearInterval(intervalRef.current)
              }
              intervalRef.current = window.setInterval(() => {
                const newTime = event.target.getCurrentTime()
                if (Math.abs(newTime - lastTimeRef.current) > 0.5) {
                  setCurrentTimeInS(newTime)
                  lastTimeRef.current = newTime
                }
              }, 200)
            } else {
              if (intervalRef.current) {
                window.clearInterval(intervalRef.current)
                intervalRef.current = null
              }
            }

            lastTimeRef.current = currentTime
          },
        },
      })
    }
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
      }
    }
  }, [isAPIReady, videoId, width, height, setCurrentTimeInS])

  return <div id={`youtube-player-${videoId}`}></div>
}

export default YouTubeEmbed
