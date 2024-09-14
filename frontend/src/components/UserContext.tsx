import React, { createContext, useState, useContext, ReactNode } from "react"

interface UserContextType {
  apiKey: string
  updateApiKey: (apiKey: string) => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export const UserProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [apiKey, setApiKey] = useState(localStorage.getItem("apiKey") || "")
  const updateApiKey = (newApiKey: string) => {
    setApiKey(newApiKey)
    localStorage.setItem("apiKey", newApiKey)
  }

  return (
    <UserContext.Provider value={{ apiKey, updateApiKey }}>
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
