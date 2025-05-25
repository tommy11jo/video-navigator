import { useState } from "react"
import { useUser } from "./UserContext"

const ApiKeyButton = () => {
  const { apiKey, updateApiKey } = useUser()
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [tempApiKey, setTempApiKey] = useState("")

  const handleSetApiKey = () => {
    setTempApiKey(apiKey)
    setShowApiKeyModal(true)
  }

  const handleSaveApiKey = () => {
    updateApiKey(tempApiKey)
    setShowApiKeyModal(false)
  }

  const handleCancelApiKey = () => {
    setTempApiKey("")
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
        Set API Key
      </button>

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="flex flex-col max-w-md bg-black p-4 rounded-lg shadow-lg border border-gray-700">
            <span className="text-white">Set Anthropic API Key</span>
            <p className="text-sm text-gray-400 mt-1 mb-2">
              It's advised to set a usage limit on your key. The key is stored in
              local storage and passed to my backend over HTTPS.
            </p>
            <input
              type="text"
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              placeholder="sk-ant-api03-..."
              className="bg-white text-black border border-gray-300 p-2 mt-2 mb-4 w-full rounded"
            />
            <div className="flex justify-between">
              <button
                onClick={handleCancelApiKey}
                className="text-gray-400 hover:text-gray-300 border border-gray-600 bg-gray-800/50 px-4 py-2 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveApiKey}
                className="bg-blue-accent text-white px-4 py-2 rounded hover:bg-blue-accent/80 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ApiKeyButton