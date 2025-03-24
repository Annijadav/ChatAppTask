export const dummyUsers = [
  {
    id: "user1",
    name: "Alice Johnson",
    email: "alice@example.com",
    avatar: "/placeholder.svg?height=200&width=200",
    isOnline: true,
    lastMessage: "Hey, how are you doing?",
    lastMessageTime: "10:30 AM",
    lastSeen: null,
    phone: "+1 (555) 123-4567",
  },
  {
    id: "user2",
    name: "Bob Smith",
    email: "bob@example.com",
    avatar: "/placeholder.svg?height=200&width=200",
    isOnline: false,
    lastMessage: "Can we meet tomorrow?",
    lastMessageTime: "Yesterday",
    lastSeen: "2 hours ago",
    phone: "+1 (555) 987-6543",
  },
  {
    id: "user3",
    name: "Carol Williams",
    email: "carol@example.com",
    avatar: "/placeholder.svg?height=200&width=200",
    isOnline: true,
    lastMessage: "The project is going well!",
    lastMessageTime: "2:45 PM",
    lastSeen: null,
    phone: "+1 (555) 456-7890",
  },
  {
    id: "user4",
    name: "Dave Brown",
    email: "dave@example.com",
    avatar: "/placeholder.svg?height=200&width=200",
    isOnline: false,
    lastMessage: "Check out this new design",
    lastMessageTime: "Monday",
    lastSeen: "1 day ago",
    phone: "+1 (555) 234-5678",
  },
  {
    id: "user5",
    name: "Eve Davis",
    email: "eve@example.com",
    avatar: "/placeholder.svg?height=200&width=200",
    isOnline: true,
    lastMessage: "Thanks for your help!",
    lastMessageTime: "Just now",
    lastSeen: null,
    phone: "+1 (555) 876-5432",
  },
]

export const dummyChats = [
  {
    id: "msg1",
    senderId: "user1",
    receiverId: "currentUser",
    text: "Hey, how are you doing?",
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
  },
  {
    id: "msg2",
    senderId: "currentUser",
    receiverId: "user1",
    text: "I'm good, thanks! How about you?",
    timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(), // 1.5 hours ago
  },
  {
    id: "msg3",
    senderId: "user1",
    receiverId: "currentUser",
    text: "Doing well! Just working on that project we discussed.",
    timestamp: new Date(Date.now() - 3600000 * 1).toISOString(), // 1 hour ago
  },
  {
    id: "msg4",
    senderId: "currentUser",
    receiverId: "user1",
    text: "Great! How's the progress so far?",
    timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
  },
  {
    id: "msg5",
    senderId: "user1",
    receiverId: "currentUser",
    text: "It's coming along nicely. I should have a demo ready by tomorrow.",
    timestamp: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
  },
  {
    id: "msg6",
    senderId: "currentUser",
    receiverId: "user1",
    text: "That sounds excellent! Looking forward to seeing it.",
    timestamp: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
  },
  {
    id: "msg7",
    senderId: "user1",
    receiverId: "currentUser",
    text: "I'll send you the link as soon as it's ready.",
    timestamp: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
  },
  {
    id: "msg8",
    senderId: "user2",
    receiverId: "currentUser",
    text: "Can we meet tomorrow to discuss the project?",
    timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
  },
  {
    id: "msg9",
    senderId: "currentUser",
    receiverId: "user2",
    text: "Sure, what time works for you?",
    timestamp: new Date(Date.now() - 82800000).toISOString(), // 23 hours ago
  },
]

