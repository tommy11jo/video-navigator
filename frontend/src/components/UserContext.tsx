import React, { createContext, useState, useContext, ReactNode } from "react"

interface User {
  apiKey: string
}

interface UserContextType {
  user: User
  setApiKey: (apiKey: string) => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export const UserProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User>(() => ({
    apiKey: localStorage.getItem("apiKey") || "",
  }))

  const setApiKey = (apiKey: string) => {
    setUser((prevUser) => ({ ...prevUser, apiKey }))
    localStorage.setItem("apiKey", apiKey)
  }

  return (
    <UserContext.Provider value={{ user, setApiKey }}>
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
