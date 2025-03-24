"use client";

import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Menu, Phone, Video, Info } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import UserProfileModal from "./user-profile-modal";
import { sendChatMessage, deleteMessage } from "@/lib/api";
import {
  getSocket,
  initializeSocket,  // Make sure this is imported
  sendMessage,
  sendTypingStatus,
  markMessageRead,
  joinChat,
  leaveChat,
} from "@/lib/socket";

export default function ChatArea({
  selectedChat,
  messages,
  currentUser,
  setIsMobileMenuOpen,
  setMessages,
}) {
  const [message, setMessage] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  console.log(messages,'message from chat area last');
  useEffect(() => {
    // Reset state when chat changes
    setMessage("");
    setTypingUsers({});

    if (!selectedChat?.id || !currentUser?.id) return;

    let mounted = true;
    let socket = null;

    const initChat = async () => {
      try {
        socket = await initializeSocket();
        
        if (!socket || !mounted) return;

        // Join chat room
        await joinChat(selectedChat.id);
        
        // Set up message handler
        socket.on('newMessage', handleNewMessage);
        socket.on('messageRead', handleMessageRead);

        // Request any missed messages
        socket.emit('getMissedMessages', { 
          chatId: selectedChat.id,
          lastMessageTime: messages[messages.length - 1]?.createdAt 
        });

      } catch (error) {
        console.error('Chat initialization error:', error);
      }
    };

    initChat();

    return () => {
      mounted = false;
      if (socket) {
        socket.off('newMessage');
        socket.off('messageRead');
        leaveChat(selectedChat.id).catch(console.error);
      }
    };
  }, [selectedChat?.id, currentUser?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim() || sending) return;

    try {
      setSending(true);
      const socket = getSocket();

      if (!socket) {
        throw new Error("Socket connection not available");
      }

      // Create message object
      const messageData = {
        chatId: selectedChat.id,
        content: message.trim(),
        messageType: "text",
        sender: {
          userId: currentUser.id,
          displayName: currentUser.displayName,
          profilePicture: currentUser.profilePicture
        },
        createdAt: new Date().toISOString()
      };

      // Add message optimistically
      const optimisticMessage = {
        ...messageData,
        id: `temp-${Date.now()}`,
        messageId: `temp-${Date.now()}`,
        sender: {
          _id: currentUser.id,
          ...messageData.sender
        }
      };
      
      setMessages(prev => [...prev, optimisticMessage]);
      
      // Send via socket
      await sendMessage(selectedChat.id, message.trim(), "text");
      setMessage("");
      scrollToBottom();
    } catch (error) {
      console.error("Error sending message:", error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')));
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await deleteMessage(selectedChat.id, messageId);
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  const handleMessageInput = (e) => {
    setMessage(e.target.value);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    const socket = getSocket();
    if (socket && selectedChat?.id) {
      sendTypingStatus(selectedChat.id, true);

      typingTimeoutRef.current = setTimeout(() => {
        sendTypingStatus(selectedChat.id, false);
      }, 1000);
    }
  };

  const renderMessage = (message, isFirstInGroup, isLastInGroup) => {
    console.log('message from area', message);
    const senderId = message.sender?.userId || message.sender?._id;
    const isCurrentUser = senderId === currentUser.id;
    const messageId = message.messageId || message.id || `${message.createdAt}-${senderId}`;

    return (
      <div 
        key={messageId} 
        className={`flex w-full my-1 ${isCurrentUser ? "justify-end" : "justify-start"}`}
      >
        <div
          className={`flex ${
            isCurrentUser ? "flex-row-reverse" : "flex-row"
          } items-end ${isCurrentUser ? "mr-2" : "ml-2"} max-w-[80%`}
        >
          {!isCurrentUser && isFirstInGroup && (
            <Avatar className="h-8 w-8 flex-shrink-0 -mb-1">
              <AvatarImage src={message.sender.profilePicture} />
              <AvatarFallback>{message.sender.displayName[0]}</AvatarFallback>
            </Avatar>
          )}

          <div
            className={`flex flex-col ${
              isCurrentUser ? "items-end" : "items-start"
            } ${!isCurrentUser && isFirstInGroup ? "ml-2" : ""}`}
          >
            {!isCurrentUser && isFirstInGroup && (
              <span className="text-xs text-gray-400 mb-1">
                {message.sender.displayName}
              </span>
            )}

            <div
              className={`
                px-3 py-2 break-words max-w-full
                ${
                  isCurrentUser
                    ? "bg-green-700 text-white rounded-lg rounded-tr-none"
                    : "bg-gray-800 text-white rounded-lg rounded-tl-none"
                }
              `}
            >
              <span className="whitespace-pre-wrap">{message.content}</span>
              <span className="text-[10px] text-gray-300 opacity-70 float-right ml-2 mt-1">
                {formatDistanceToNow(new Date(message.createdAt), {
                  addSuffix: false,
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleNewMessage = (data) => {
    console.log('New message received:', data);
    if (data.chatId === selectedChat?.id) {
      const newMessage = {
        id: data.messageId || data.id,
        messageId: data.messageId || data.id,
        content: data.content,
        messageType: data.messageType || 'text',
        sender: {
          _id: data.sender.userId || data.sender._id,
          userId: data.sender.userId || data.sender._id,
          displayName: data.sender.displayName,
          profilePicture: data.sender.profilePicture,
        },
        createdAt: data.createdAt || new Date().toISOString(),
        readBy: data.readBy || [],
      };

      setMessages((prev) => [...prev, newMessage]);
      scrollToBottom();
    }
  };

  const handleMessageRead = (data) => {
    console.log("Message read:", data);
  };

  // Group messages by sender and time
  const groupedMessages = messages.reduce((groups, message) => {
    const lastGroup = groups[groups.length - 1];
    const senderId = message.sender._id;
    const messageId = message.id;
    if (
      lastGroup &&
      lastGroup[0].sender._id === senderId &&
      // Messages within 5 minutes are grouped
      Math.abs(new Date(lastGroup[0].createdAt) - new Date(message.createdAt)) <
        300000
    ) {
      lastGroup.push(message);
    } else {
      groups.push([message]);
    }
    return groups;
  }, []);

  return (
    <div className="flex-1 flex flex-col h-screen bg-gray-900">
      {/* Chat header */}
      <div className="bg-green-800 px-4 py-3 flex justify-between items-center sticky top-0 z-10 shadow-md">
        <div className="flex items-center space-x-3">
          <button
            className="flex items-center space-x-2"
            onClick={() => setShowProfile(true)}
          >
            <div className="relative">
              <Avatar>
                <AvatarImage
                  src={selectedChat.otherUser.photoURL}
                  alt={selectedChat.otherUser.name}
                />
                <AvatarFallback className="bg-green-600 text-white">
                  {selectedChat.otherUser.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("") || selectedChat.otherUser.email[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-green-800 
                ${
                  selectedChat.otherUser.isOnline
                    ? "bg-green-500"
                    : "bg-gray-400"
                }`}
              />
            </div>
            <div>
              <p className="font-semibold text-white">
                {selectedChat.otherUser.name || selectedChat.otherUser.email}
              </p>
              <p className="text-xs text-green-100 opacity-80">
                {selectedChat.otherUser.isOnline
                  ? "Online"
                  : selectedChat.otherUser.lastSeen
                  ? `Last seen ${formatDistanceToNow(
                      new Date(selectedChat.otherUser.lastSeen),
                      { addSuffix: true }
                    )}`
                  : "Offline"}
              </p>
            </div>
          </button>
        </div>
        <div className="flex space-x-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-green-700"
          >
            <Phone className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-green-700"
          >
            <Video className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-green-700"
            onClick={() => setShowProfile(true)}
          >
            <Info className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Chat messages area with wallpaper background */}
      <div
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 bg-gray-800"
        style={{
          backgroundImage:
            "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjUwMCIgdmlld0JveD0iMCAwIDUwMCA1MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGRlZnM+CiAgICA8cGF0dGVybiBpZD0iZG90cyIgeD0iMCIgeT0iMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KICAgICAgPGNpcmNsZSBmaWxsPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMDUpIiBjeD0iMi41IiBjeT0iMi41IiByPSIwLjUiIC8+CiAgICA8L3BhdHRlcm4+CiAgPC9kZWZzPgogIDxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMxNzFmMjciIC8+CiAgPHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNkb3RzKSIgLz4KPC9zdmc+')",
          backgroundRepeat: "repeat",
        }}
      >
        <div className="flex flex-col p-3 min-h-full">
          {messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="bg-gray-800 bg-opacity-80 p-4 rounded-lg text-gray-300 text-center">
                <p>
                  Start a conversation with{" "}
                  {selectedChat.otherUser.name || selectedChat.otherUser.email}!
                </p>
                <p className="text-xs mt-2 text-gray-400">
                  Messages are end-to-end encrypted
                </p>
              </div>
            </div>
          ) : (
            <div className="w-full">
              {groupedMessages.map((group, groupIndex) => {
                const firstMessage = group[0];
                const groupKey = `group-${firstMessage.messageId || firstMessage.id || Date.parse(firstMessage.createdAt)}-${groupIndex}`;
                
                return (
                  <div key={groupKey} className="mb-3">
                    {/* Date separator */}
                    {groupIndex > 0 && new Date(group[0].createdAt).toDateString() !== 
                      new Date(groupedMessages[groupIndex - 1][0].createdAt).toDateString() && (
                      <div key={`date-${groupKey}`} className="flex justify-center my-4">
                        <div className="bg-gray-700 text-gray-300 text-xs px-3 py-1 rounded-full">
                          {new Date(group[0].createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                    
                    {/* Messages */}
                    {group.map((message, messageIndex) => (
                      <div key={`${message.messageId || message.id || Date.parse(message.createdAt)}-${messageIndex}`}>
                        {renderMessage(
                          message,
                          messageIndex === 0,
                          messageIndex === group.length - 1
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Typing indicator */}
      {Object.keys(typingUsers).length > 0 && (
        <div className="px-4 py-1 bg-gray-800 border-t border-gray-700">
          <p className="text-green-400 text-xs">
            {selectedChat.otherUser.name || "Someone"} is typing...
          </p>
        </div>
      )}

      {/* Message input */}
      <div className="p-2 bg-gray-800 border-t border-gray-700">
        <form onSubmit={handleSend} className="flex items-center gap-2 px-1">
          <Input
            value={message}
            onChange={handleMessageInput}
            placeholder="Type a message..."
            className="flex-1 bg-gray-700 border-gray-600 text-white rounded-full py-5"
            disabled={sending}
          />
          <Button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white rounded-full h-10 w-10 flex items-center justify-center p-0"
            disabled={!message.trim() || sending}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
            </svg>
          </Button>
        </form>
      </div>

      {/* User profile modal */}
      {showProfile && (
        <UserProfileModal
          user={selectedChat.otherUser}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
}
