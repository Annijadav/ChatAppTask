"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import ChatSidebar from "@/components/chat/chat-sidebar";
import ChatArea from "@/components/chat/chat-area";
import AddUserModal from "@/components/chat/add-user-modal";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFriends, getUserChats } from "@/lib/api";
import { initializeSocket, getSocket, joinChat } from "@/lib/socket";

export default function ChatPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated, setLoading } = useAuth();
  const [selectedChat, setSelectedChat] = useState(null);
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  console.log("user from chats page", user);
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/login");
      return;
    }

    let mounted = true;

    const initializeChat = async () => {
      if (!user?.uid || !isAuthenticated) return;

      try {
        setLoadingChats(true);
        const userChats = await getUserChats(user.uid);
        if (mounted) {
          setChats(userChats || []);
          setLoadingChats(false);
        }
      } catch (error) {
        console.error("Error fetching chats:", error);
        if (mounted) setLoadingChats(false);
      }
    };

    initializeChat();
    return () => {
      mounted = false;
    };
  }, [user?.uid, isAuthenticated, loading]);

  useEffect(() => {
    if (!selectedChat?.id) {
      setMessages([]);
      return;
    }

    // Messages are now handled through socket events in ChatArea component
  }, [selectedChat]);

  useEffect(() => {
    const fetchFriends = async () => {
      if (!isAuthenticated || !user) return;

      try {
        setLoadingFriends(true);
        const response = await getFriends();
        setFriends(response || []);
      } catch (error) {
        console.error("Error fetching friends:", error);
      } finally {
        setLoadingFriends(false);
      }
    };

    fetchFriends();
  }, [isAuthenticated, user]);

  // Initialize socket connection
  useEffect(() => {
    if (!user?._id || !isAuthenticated) return;

    let mounted = true;
    let currentSocket = null;

    const setupSocket = async () => {
      try {
        currentSocket = await initializeSocket();

        if (currentSocket && mounted) {
          // Set up message handler
          currentSocket.on("receiveMessage", (message) => {
            if (message.chatId === selectedChat?.id) {
              setMessages((prev) => [...prev, message]);
            }

            // Update chats list
            setChats((prev) =>
              prev.map((chat) => {
                if (chat.id === message.chatId) {
                  return {
                    ...chat,
                    lastMessage: message.content,
                    lastMessageTime: message.createdAt,
                  };
                }
                return chat;
              })
            );
          });
        }
      } catch (error) {
        console.error("Socket setup error:", error);
      }
    };

    setupSocket();

    return () => {
      mounted = false;
      if (currentSocket) {
        currentSocket.off("receiveMessage");
      }
    };
  }, [user?._id, isAuthenticated, selectedChat?.id]);

  // Join chat room when selecting a chat
  useEffect(() => {
    if (selectedChat?.id) {
      joinChat(selectedChat.id);
    }
  }, [selectedChat?.id]);

  useEffect(() => {
    const initChat = async () => {
      if (!user?._id) return;

      try {
        const socket = await initializeSocket();
        if (!socket) throw new Error("Failed to initialize socket");

        // Get initial user statuses
        socket.emit("getOnlineUsers");

        // Get user's chats
        const response = await getUserChats(user.id);
        setChats(response || []);
      } catch (error) {
        console.error("Chat initialization error:", error);
      }
    };

    initChat();
  }, [user?._id]);

  useEffect(() => {
    const handleOnlineUsers = (event) => {
      const onlineUsers = event.detail;
      setFriends((prev) =>
        prev.map((friend) => ({
          ...friend,
          isOnline: onlineUsers.some((user) => user.id === friend._id),
        }))
      );
    };

    const handleUserStatus = (event) => {
      const { user, status } = event.detail;
      setFriends((prev) =>
        prev.map((friend) => {
          if (friend._id === user.userId) {
            return {
              ...friend,
              isOnline: status,
              lastSeen: !status ? user.lastSeen : friend.lastSeen,
            };
          }
          return friend;
        })
      );
    };

    window.addEventListener("onlineUsers", handleOnlineUsers);
    window.addEventListener("userStatus", handleUserStatus);

    return () => {
      window.removeEventListener("onlineUsers", handleOnlineUsers);
      window.removeEventListener("userStatus", handleUserStatus);
    };
  }, []);

  useEffect(() => {
    if (!user?._id || !isAuthenticated) return;

    let mounted = true;

    const setupSocket = async () => {
      try {
        const socket = await initializeSocket();
        if (!socket) {
          console.error("Failed to initialize socket");
          return;
        }

        console.log("Socket initialized successfully");
      } catch (error) {
        console.error("Socket setup error:", error);
      }
    };

    setupSocket();

    return () => {
      mounted = false;
    };
  }, [user?._id, isAuthenticated]);

  useEffect(() => {
    if (!user?.id) return;

    const fetchChats = async () => {
      try {
        setLoadingChats(true);
        // console.log("Fetching chats for user:", user.id);

        const chatData = await getUserChats(user.id);
        // console.log("Raw chat data:", chatData);

        setMessages(chatData);
        
      } catch (error) {
        console.error("Error fetching chats:", error);
      } finally {
        setLoadingChats(false);
      }
    };

    fetchChats();
  }, [user?.id]);

  const handleChatSelect = async (chat) => {
    try {
      // Clear current chat state
      setSelectedChat(null);
      setMessages([]);
      setIsMobileMenuOpen(false);

      if (chat.id) {
        console.log("Selecting chat:", chat.id);
        // Fetch fresh chat data
        const chatData = await getUserChats(chat.otherUser.uid);

        if (chatData) {
          // Update messages
          const formattedMessages =
            chatData.messages?.map((msg) => ({
              id: msg.chatId,
              content: msg.content,
              messageType: msg.messageType,
              sender: {
                _id: msg.sender._id,
                displayName: msg.sender.displayName,
                profilePicture: msg.sender.profilePicture,
              },
              createdAt: msg.createdAt,
              readBy: msg.readBy || [],
            })) || [];

          // Set messages first
          setMessages(formattedMessages);

          // Then update selected chat with complete data
          setSelectedChat({
            id: chatData.chatId,
            participants: chatData.participants,
            messages: formattedMessages,
            otherUser: chat.otherUser, // Keep the original otherUser data
          });

          // Join the chat room
          await joinChat(chatData.chatId);
        }
      }
    } catch (error) {
      console.error("Error selecting chat:", error);
    }
  };

  const handleAddUser = () => {
    setIsAddUserModalOpen(true);
  };

  const handleUserAdded = () => {
    // Refresh chats after adding a new user
    if (user) {
      getUserChats(user.uid).then((userChats) => {
        setChats(userChats);
      });
    }
  };

  const handleStartChat = async (friend) => {
    try {
      // Check if chat already exists with this friend
      const existingChat = chats.find(
        (chat) =>
          chat.otherUser.uid === friend.firebaseUid ||
          chat.participants?.includes(friend.firebaseUid)
      );

      if (existingChat) {
        setSelectedChat(existingChat);
      } else {
        // Initialize new chat
        const chatId = await initializeChat(
          user.firebaseUid,
          friend.firebaseUid
        );
        const newUserChats = await getUserChats(user.uid);
        setChats(newUserChats);

        // Find and select the new chat
        const newChat = newUserChats.find((chat) => chat.id === chatId);
        if (newChat) setSelectedChat(newChat);
      }
    } catch (error) {
      console.error("Error starting chat:", error);
    }
  };

  // Show loading state while checking auth
  if (loading || !isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <div className="text-green-400 text-xl animate-pulse">
          Loading your chats...
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      <ChatSidebar
        chats={chats}
        selectedChat={selectedChat}
        onSelectChat={handleChatSelect}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        onAddUser={handleAddUser}
        loading={loadingChats}
        currentUser={user}
        friends={friends}
        loadingFriends={loadingFriends}
        onStartChat={handleStartChat}
      />

      {selectedChat ? (
        <ChatArea
          selectedChat={selectedChat}
          messages={messages}
          currentUser={user}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          setMessages={setMessages}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-4 bg-gray-950">
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold text-green-400 mb-4">
              Welcome to Chat
            </h2>
            <p className="text-gray-400 mb-6">
              Select a conversation from the sidebar or start a new chat by
              adding a user.
            </p>
            <Button
              onClick={handleAddUser}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
            >
              <PlusCircle size={18} />
              Add New User
            </Button>
          </div>
        </div>
      )}

      {isAddUserModalOpen && (
        <AddUserModal
          onClose={() => setIsAddUserModalOpen(false)}
          currentUser={user}
          onUserAdded={handleUserAdded}
        />
      )}
    </div>
  );
}
