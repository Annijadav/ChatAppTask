"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Search, UserPlus } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createChat } from "@/lib/firebase"  // Keep only createChat from firebase
import { searchUsers, addFriend } from "@/lib/api"  // Import searchUsers and addFriend from api.js

export default function AddUserModal({ onClose, currentUser, onUserAdded }) {
  const [email, setEmail] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!email.trim()) return

    try {
      setLoading(true)
      setError("")
      setSuccess("")

      const response = await searchUsers(email)
      
      // Handle array response directly
      const users = Array.isArray(response) ? response : []
      
      // Filter out current user if needed
      const filteredUsers = users.filter(user => user.firebaseUid !== currentUser.uid)
      
      setSearchResults(filteredUsers.map(user => ({
        uid: user.firebaseUid,
        email: user.email,
        name: user.displayName,
        photoURL: user.profilePicture
      })))

      if (filteredUsers.length === 0) {
        setError("No users found with that email address.")
      }
    } catch (error) {
      console.error("Error searching users:", error)
      setError(error.message || "An error occurred while searching for users.")
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = async (user) => {
    try {
      setLoading(true)
      setError("")

      // Call the new API endpoint
      await addFriend(user.uid)
      
      setSuccess(`${user.name || user.email} has been added successfully!`)
      setSearchResults([])
      setEmail("")

      // Notify parent component
      onUserAdded()

      // Close modal after a delay
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (error) {
      console.error("Error adding user:", error)
      setError(error.message || "An error occurred while adding the user.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-green-400">Add New User</h2>
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white hover:bg-gray-800"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6">
          {error && (
            <Alert variant="destructive" className="mb-4 bg-red-900 border-red-800">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 bg-green-900 border-green-800">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Search by email address..."
                  className="pl-10 bg-gray-800 border-gray-700 text-white"
                  disabled={loading}
                />
              </div>
              <Button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={!email.trim() || loading}
              >
                {loading ? "Searching..." : "Search"}
              </Button>
            </div>
          </form>

          {searchResults.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Search Results</h3>
              <ul className="space-y-2">
                {searchResults.map((user) => (
                  <li key={user.uid} className="bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={user.photoURL} alt={user.name} />
                          <AvatarFallback className="bg-green-700 text-white">
                            {user.name
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("") || user.email[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.name || "User"}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-green-400 hover:text-green-300 hover:bg-gray-700"
                        onClick={() => handleAddUser(user)}
                        disabled={loading}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

