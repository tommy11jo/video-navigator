import { useState, useEffect } from "react"
import { useUser, ModelChoice } from "./UserContext"

// Pricing based on ~30k input tokens + ~5k output tokens for a 30 min video
// Haiku: $1/$5 per MTok → ~$0.055, Sonnet: $3/$15 → ~$0.17, Opus: $5/$25 → ~$0.28
const MODEL_OPTIONS: {
  id: ModelChoice
  name: string
  price: string
  desc: string
}[] = [
  { id: "haiku-4-5", name: "Haiku 4.5", price: "$0.05", desc: "Fastest" },
  { id: "sonnet-4-5", name: "Sonnet 4.5", price: "$0.15", desc: "Balanced" },
  { id: "opus-4-5", name: "Opus 4.5", price: "$0.25", desc: "Most capable" },
]

const ApiKeyButton = () => {
  const { apiKey, updateApiKey, model, updateModel } = useUser()
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [tempApiKey, setTempApiKey] = useState("")
  const [tempModel, setTempModel] = useState<ModelChoice>("haiku-4-5")
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (showApiKeyModal) {
      setTempApiKey(apiKey)
      setTempModel(model)
      setSaved(false)
    }
  }, [showApiKeyModal, apiKey, model])

  const handleSetApiKey = () => {
    setShowApiKeyModal(true)
  }

  const handleSaveApiKey = () => {
    updateApiKey(tempApiKey.trim())
    updateModel(tempModel)
    setSaved(true)
    setTimeout(() => {
      setShowApiKeyModal(false)
    }, 500)
  }

  const handleClear = () => {
    setTempApiKey("")
    updateApiKey("")
    setSaved(true)
  }

  const handleCancel = () => {
    setShowApiKeyModal(false)
  }

  return (
    <>
      <button
        onClick={handleSetApiKey}
        className={`text-sm px-3 py-1 rounded transition-colors ${
          apiKey
            ? "text-gray-400 hover:text-gray-300 border border-gray-600 bg-gray-800/50"
            : "text-blue-400 hover:text-blue-300 border border-blue-400 bg-blue-900/30"
        }`}
      >
        {apiKey ? "Claude API Key Set" : "Set Claude API Key"}
      </button>

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-50">
          <div className="flex flex-col max-w-md bg-gray-900 p-6 rounded-lg shadow-lg border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-semibold text-white">
                Set Claude API Key
              </span>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-200 transition-colors"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-400 mb-4">
              After the free tier is exhausted, you'll need your own Anthropic
              API key to generate video overviews. Your key is stored locally in
              your browser and sent securely over HTTPS.
            </p>

            <input
              type="password"
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              placeholder="sk-ant-api03-..."
              className="bg-gray-800 text-white border border-gray-600 p-3 mb-4 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            <label className="block text-sm font-medium text-gray-300 mb-2">
              Model
            </label>
            <div
              className={`space-y-2 mb-4 ${!tempApiKey.trim() ? "opacity-50 pointer-events-none" : ""}`}
            >
              {MODEL_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-center justify-between p-3 border rounded cursor-pointer transition-colors ${
                    tempModel === opt.id
                      ? "border-blue-500 bg-blue-900/30"
                      : "border-gray-600 hover:border-gray-500 bg-gray-800/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="model"
                      value={opt.id}
                      checked={tempModel === opt.id}
                      onChange={(e) =>
                        setTempModel(e.target.value as ModelChoice)
                      }
                      className="text-blue-500"
                    />
                    <div>
                      <span className="font-medium text-white">{opt.name}</span>
                      <span className="text-gray-400 text-sm ml-2">
                        {opt.desc}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm text-gray-300">
                    ~{opt.price}
                    <span className="text-xs text-gray-500">/30 min video</span>
                  </span>
                </label>
              ))}
            </div>
            {!tempApiKey.trim() && (
              <p className="text-xs text-gray-500 mb-4">
                Set API key to unlock model selection
              </p>
            )}

            {saved && <p className="text-sm text-green-500 mb-4">Saved!</p>}

            <div className="flex gap-2">
              <button
                onClick={handleSaveApiKey}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors font-medium"
              >
                Save
              </button>
              <button
                onClick={handleClear}
                className="px-4 py-2 border border-gray-600 rounded hover:bg-gray-800 transition-colors text-gray-300"
              >
                Clear
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-4">
              Get your API key from{" "}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                console.anthropic.com
              </a>
            </p>
          </div>
        </div>
      )}
    </>
  )
}

export default ApiKeyButton