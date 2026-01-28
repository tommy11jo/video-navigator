import React, { createContext, useState, useContext, ReactNode } from "react"

export type ModelChoice = "haiku-4-5" | "sonnet-4-5" | "opus-4-5"

interface UserContextType {
  apiKey: string
  updateApiKey: (apiKey: string) => void
  model: ModelChoice
  updateModel: (model: ModelChoice) => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export const UserProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [apiKey, setApiKey] = useState(localStorage.getItem("apiKey") || "")
  const [model, setModel] = useState<ModelChoice>(
    (localStorage.getItem("model") as ModelChoice) || "haiku-4-5"
  )

  const updateApiKey = (newApiKey: string) => {
    setApiKey(newApiKey)
    if (newApiKey) {
      localStorage.setItem("apiKey", newApiKey)
    } else {
      localStorage.removeItem("apiKey")
    }
  }

  const updateModel = (newModel: ModelChoice) => {
    setModel(newModel)
    localStorage.setItem("model", newModel)
  }

  return (
    <UserContext.Provider value={{ apiKey, updateApiKey, model, updateModel }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}
