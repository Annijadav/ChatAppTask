"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { X, Mail, Phone } from "lucide-react"

export default function UserProfileModal({ user, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-green-400">Profile</h2>
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white hover:bg-gray-800"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 flex flex-col items-center space-y-4">
          <Avatar className="h-24 w-24">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="bg-green-700 text-white text-xl">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>

          <div className="text-center">
            <h3 className="text-xl font-bold">{user.name}</h3>
            <p className="text-sm text-gray-400">
              {user.isOnline ? "Online" : user.lastSeen ? `Last seen ${user.lastSeen}` : "Offline"}
            </p>
          </div>

          <div className="w-full space-y-4 pt-4">
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <span>{user.email}</span>
            </div>
            {user.phone && (
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-gray-400" />
                <span>{user.phone}</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-800 flex justify-center space-x-2">
          <Button className="bg-green-600 hover:bg-green-700 text-white">Message</Button>
          <Button variant="outline" className="border-gray-700 text-white hover:bg-gray-800">
            Block
          </Button>
        </div>
      </div>
    </div>
  )
}

