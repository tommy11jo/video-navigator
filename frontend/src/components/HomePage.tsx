import { Link, useNavigate } from "react-router-dom"
import { useState, useEffect, useRef } from "react"
import { useMutation } from "@tanstack/react-query"
import axios from "axios"
import { Loader2 } from "lucide-react"

function HomePage() {
  const [videoUrl, setVideoUrl] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const staticExamples = [
    {
      videoId: "uI7J3II59lc",
      title: "Hypercard in the World, May 2016",
    },
    {
      videoId: "C27RVio2rOs",
      title: "Michael Seibel - Building Product",
    },
    {
      videoId: "VMj-3S1tku0",
      title:
        "The spelled-out intro to neural networks and backpropagation: building micrograd",
    },
    {
      videoId: "Uj6skZIxPuI",
      title:
        "David Reich – How One Small Tribe Conquered the World 70,000 Years Ago",
    },
  ]

  const navigate = useNavigate()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const generateOverviewMutation = useMutation({
    mutationFn: (videoId: string) =>
      axios
        .post(`${import.meta.env.VITE_API_URL}/generate-overview/${videoId}`)
        .then((res) => res.data),
    onSuccess: (_, videoId) => {
      setIsGenerating(false)
      navigate(`/video/${videoId}`)
    },
    onError: (error) => {
      console.error("Error generating overview:", error)
      setIsGenerating(false)
    },
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMessage("") // Clear any previous error messages
    const params = new URLSearchParams(new URL(videoUrl).search)
    const videoId = params.get("v")
    if (videoId) {
      setIsGenerating(true)
      generateOverviewMutation.mutate(videoId)
    } else {
      setErrorMessage("Invalid YouTube URL. Please enter a valid URL.")
      console.error("Invalid YouTube URL")
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-1 pt-8">
        <form onSubmit={handleSubmit} className="max-w-md mx-auto mb-8">
          <input
            ref={inputRef}
            type="text"
            placeholder="Enter YouTube URL"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black mb-4"
          />
          <div className="flex justify-center">
            <button
              type="submit"
              className="inline-flex items-center bg-blue-accent rounded-md px-4 py-2"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Overview"
              )}
            </button>
          </div>
          {errorMessage && (
            <p className="text-red-500 text-sm mt-2">{errorMessage}</p>
          )}
        </form>
        <div className="mt-8 max-w-md mx-auto">
          <p className="font-bold">Examples:</p>
          <ul className="list-disc">
            {staticExamples.map((example) => (
              <li className="mx-2" key={example.videoId}>
                <Link
                  to={`/video/${example.videoId}`}
                  className="text-blue-accent hover:underline"
                >
                  {example.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default HomePage
