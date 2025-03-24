"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { auth, onAuthStateChanged } from "@/lib/firebaseauth"
import { disconnectSocket } from "@/lib/socket"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(async (firebaseUser) => {
      try {
        setLoading(true);
        const token = localStorage.getItem('jwt_token');
        const userData = localStorage.getItem('user');

        if (token && userData) {
          try {
            // Verify token is valid JWT
            const [header, payload, signature] = token.split('.');
            if (!header || !payload || !signature) {
              throw new Error('Invalid token format');
            }

            const parsedUser = JSON.parse(userData);
            if (!parsedUser.id) {
              throw new Error('Invalid user data');
            }

            setUser(parsedUser);
            setIsAuthenticated(true);
          } catch (error) {
            console.error('Token validation error:', error);
            handleLogout();
          }
        } else {
          handleLogout();
        }
      } catch (error) {
        console.error('Auth state error:', error);
        handleLogout();
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe()
  }, [])

  const handleLogout = async () => {
    try {
      // Disconnect socket before logout
      disconnectSocket();
      localStorage.clear()
      sessionStorage.clear()
      document.cookie = 'jwt_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
      setUser(null)
      setIsAuthenticated(false)
      router.replace('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const value = {
    user,
    loading,
    isAuthenticated,
    setUser,
    setIsAuthenticated,
    handleLogout,
    setLoading
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === null) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

