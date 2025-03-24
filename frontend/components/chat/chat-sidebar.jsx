"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Menu, X, User, LogOut, Search, PlusCircle } from "lucide-react"
import { logout } from "@/lib/auth"
import { formatDistanceToNow } from "date-fns"
import { getOrCreateChat, getUserChats } from "@/lib/api"
import { joinChat } from "@/lib/socket"

export default function ChatSidebar({
  chats,
  selectedChat,
  onSelectChat,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  onAddUser,
  loading,
  currentUser,
  friends,
  loadingFriends,
  onStartChat  // Add this new prop
}) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const handleStatusChange = (event) => {
      const { userId, status } = event.detail;
      setFriends(prev => prev.map(friend => {
        if (friend._id === userId) {
          return { ...friend, isOnline: status };
        }
        return friend;
      }));
    };

    window.addEventListener('userStatusChange', handleStatusChange);
    return () => window.removeEventListener('userStatusChange', handleStatusChange);
  }, []);

  const filteredChats = chats.filter(
    (chat) =>
      chat.otherUser.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chat.otherUser.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleLogout = async () => {
    try {
      await logout()
      router.push("/login")
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  const handleFriendClick = async (friend) => {
    try {
      console.log('Selected friend:', friend);
      // Get chat data for this friend
      const chatData = await getUserChats(friend._id);
      console.log('Chat data received:', chatData);
      
      if (chatData) {
        // Format chat data for the selected friend
        const formattedChat = {
          id: chatData.chatId,
          participants: chatData.participants,
          messages: chatData.messages?.map(msg => ({
            id: msg.messageId,
            content: msg.content,
            messageType: msg.messageType,
            sender: {
              _id: msg.sender.userId,
              displayName: msg.sender.displayName,
              profilePicture: msg.sender.profilePicture
            },
            createdAt: msg.createdAt,
            readBy: msg.readBy || []
          })),
          otherUser: {
            uid: friend._id,
            name: friend.displayName,
            email: friend.email,
            photoURL: friend.profilePicture,
            isOnline: friend.isOnline || false,
            lastSeen: friend.lastSeen
          }
        };

        // Pass the complete chat data to parent
        onSelectChat(formattedChat);
        setIsMobileMenuOpen(false);
      }
    } catch (error) {
      console.error('Error handling friend click:', error);
    }
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="md:hidden fixed top-4 right-4 z-50 p-2 bg-gray-800 rounded-md text-white"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Sidebar */}
      <div
        className={`
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} 
        md:translate-x-0 transition-transform duration-300 ease-in-out
        fixed md:relative z-40 w-80 h-full bg-gray-900 border-r border-gray-800 flex flex-col
      `}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-green-400">Messages</h2>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-white hover:bg-gray-800"
              onClick={() => router.push("/profile")}
            >
              <User className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-white hover:bg-gray-800"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Search and Add User */}
        <div className="p-4 border-b border-gray-800">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              className="pl-10 bg-gray-800 border-gray-700 text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            onClick={onAddUser}
            className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2"
          >
            <PlusCircle size={16} />
            Add New User
          </Button>
        </div>

        {/* Chats list */}
        <div className="flex-1 overflow-y-auto">
          {loadingFriends ? (
            <div className="p-4 text-center text-gray-400">Loading friends...</div>
          ) : (
            <>
              {/* Display Friends */}
              {friends?.length > 0 && (
                <div className="p-4 border-b border-gray-800">
                  <ul className="space-y-3">
                    {friends.map((friend) => (
                      <li 
                        key={friend._id} 
                        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-800 cursor-pointer"
                        onClick={() => handleFriendClick(friend)}
                      >
                        <div className="relative">
                          <Avatar className="h-12 w-12">
                            <AvatarImage 
                              src={friend.profilePicture}
                              alt={friend.displayName}
                              className="object-cover"
                            />
                            <AvatarFallback className="bg-green-700 text-white">
                              {friend.displayName?.[0] || friend.email[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900 
                            ${friend.isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {friend.displayName || 'User'}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {friend.lastMessage?.content || friend.email}
                          </p>
                          {friend.lastMessage && (
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDistanceToNow(new Date(friend.lastMessage.createdAt), { addSuffix: true })}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Existing Chats */}
              {loading ? (
                <div className="p-4 text-center text-gray-400">Loading conversations...</div>
              ) : filteredChats.length === 0 ? (
                <div className="p-4 text-center text-gray-400">
                  {searchTerm ? "No conversations found" : "No conversations yet"}
                </div>
              ) : (
                <ul>
                  {filteredChats.map((chat) => (
                    <li key={chat.id}>
                      <button
                        className={`w-full p-3 flex items-center space-x-3 hover:bg-gray-800 ${
                          selectedChat?.id === chat.id ? "bg-gray-800" : ""
                        }`}
                        onClick={() => onSelectChat(chat)}
                      >
                        <div className="relative">
                          <Avatar>
                            <AvatarImage src={chat.otherUser.photoURL} alt={chat.otherUser.name} />
                            <AvatarFallback className="bg-green-700 text-white">
                              {chat.otherUser.name
                                ?.split(" ")
                                .map((n) => n[0])
                                .join("") || chat.otherUser.email[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline">
                            <p className="text-sm font-medium truncate">{chat.otherUser.name || chat.otherUser.email}</p>
                            {chat.lastMessageTime && (
                              <span className="text-xs text-gray-400">
                                {formatDistanceToNow(new Date(chat.lastMessageTime.toDate()), { addSuffix: true })}
                              </span>
                            )}
                          </div>
                          {chat.lastMessage && <p className="text-xs text-gray-400 truncate">{chat.lastMessage}</p>}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

