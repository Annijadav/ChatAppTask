"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context" // Ensure correct import path
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { validateProfileUpdate } from "@/lib/validation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function ProfilePage() {
  const router = useRouter()
  const { user, loading, isAuthenticated, logout } = useAuth()  // Add logout from useAuth
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [updateError, setUpdateError] = useState("")
  const [updateSuccess, setUpdateSuccess] = useState("")

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/login")
    } else if (user) {
      setFormData({
        name: user.displayName || '',
        email: user.email || '',
      })
    }
  }, [loading, isAuthenticated, user, router])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setUpdateError("")
    setUpdateSuccess("")

    // Validate form
    const { error, value } = validateProfileUpdate(formData)
    if (error) {
      const validationErrors = {}
      error.details.forEach((detail) => {
        validationErrors[detail.path[0]] = detail.message
      })
      setErrors(validationErrors)
      return
    }

    setIsLoading(true)
    try {
      // In a real app, this would be an API call
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Update current user
      setCurrentUser((prev) => ({
        ...prev,
        name: formData.name,
        email: formData.email,
      }))

      setUpdateSuccess("Profile updated successfully!")
    } catch (error) {
      setUpdateError(error.message || "Failed to update profile. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      // No need to manually redirect here as it's handled in the auth context
    } catch (error) {
      console.error("Logout failed:", error)
    }
  };

  const getInitials = (name) => {
    if (!name) return '';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  }

  const renderAvatar = () => {
    const fallbackText = user.displayName?.[0]?.toUpperCase() || 
                        user.email?.[0]?.toUpperCase() || '?';
    
    return (
      <Avatar className="h-24 w-24">
        <AvatarImage 
          src={user.profilePicture} 
          alt={user.displayName || user.email}
          className="object-cover"
        />
        <AvatarFallback className="bg-green-700 text-white text-xl">
          {fallbackText}
        </AvatarFallback>
      </Avatar>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-gray-950 text-white">Loading...</div>
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-950">
      <header className="bg-gray-900 p-4 border-b border-gray-800">
        <div className="container mx-auto flex items-center">
          <Link href="/chat" className="text-green-400 hover:text-green-300 flex items-center">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Chat
          </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-gray-900 border-green-800">
            <CardHeader>
              <div className="flex flex-col items-center space-y-4">
                {renderAvatar()}
                <div className="text-center">
                  <CardTitle className="text-2xl text-green-400">Profile Settings</CardTitle>
                  <CardDescription className="text-gray-400">Update your personal information</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {updateError && (
                <Alert variant="destructive" className="mb-4 bg-red-900 border-red-800">
                  <AlertDescription>{updateError}</AlertDescription>
                </Alert>
              )}
              {updateSuccess && (
                <Alert className="mb-4 bg-green-900 border-green-800">
                  <AlertDescription>{updateSuccess}</AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium text-gray-300">
                    Full Name
                  </label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                  {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-gray-300">
                    Email
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                  {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                </div>
                <Button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? "Updating..." : "Update Profile"}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex justify-center border-t border-gray-800 pt-6">
              <Button
                variant="outline"
                className="text-red-400 border-red-800 hover:bg-red-900 hover:text-red-300"
                onClick={handleLogout}  // Update to use handleLogout
              >
                Logout
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  )
}

