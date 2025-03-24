// filepath: d:\chatapp\frontend\lib\api.js
export const authenticateWithGoogle = async (token) => {
  try {
    const response = await fetch('/api/auth/google', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ token })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
};

export const searchUsers = async (email) => {
  try {
    const response = await fetch(`/api/friends/search?email=${encodeURIComponent(email)}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
      },
    });

    if (!response.ok) {
      throw new Error(`Search failed with status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Search error:', error);
    throw error;
  }
};

export const addFriend = async (friendId) => {
  try {
    const response = await fetch('/api/friends/add', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
      },
      body: JSON.stringify({ friendId })
    });

    if (!response.ok) {
      throw new Error(`Failed to add friend. Status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Add friend error:', error);
    throw error;
  }
};

export const getFriends = async () => {
  try {
    const response = await fetch('/api/friends/list', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch friends. Status: ${response.status}`);
    }

    const data = await response.json();
    return data.map(friend => ({
      ...friend.user,
      chatId: friend.chat?._id,
      lastMessage: friend.chat?.lastMessage,
      updatedAt: friend.chat?.updatedAt
    }));
  } catch (error) {
    console.error('Get friends error:', error);
    throw error;
  }
};

export const getOrCreateChat = async (friendId) => {
  try {
    const response = await fetch(`/api/chat/initialize/${friendId}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to initialize chat. Status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Chat initialization error:', error);
    throw error;
  }
};

export const getUserChats = async (userId) => {
  try {
    const response = await fetch(`/api/chat/user/${userId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Force reconnection on auth error
        localStorage.removeItem('jwt_token');
        window.location.href = '/login';
        throw new Error('Authentication failed');
      }
      throw new Error(`Failed to fetch chats. Status: ${response.status}`);
    }

    const chatData = await response.json();
    
    // Enhanced error checking
    if (!chatData || typeof chatData !== 'object') {
      throw new Error('Invalid chat data received');
    }

    return {
      chatId: chatData.chatId,
      participants: chatData.participants || [],
      messages: (chatData.messages || []).map(msg => ({
        id: msg.messageId || msg.id,
        messageId: msg.messageId || msg.id,
        content: msg.content,
        messageType: msg.messageType || 'text',
        sender: {
          _id: msg.sender.userId || msg.sender._id,
          userId: msg.sender.userId || msg.sender._id,
          displayName: msg.sender.displayName || 'Unknown',
          profilePicture: msg.sender.profilePicture
        },
        createdAt: msg.createdAt || new Date().toISOString(),
        readBy: msg.readBy || []
      }))
    };
  } catch (error) {
    console.error('Get chats error:', error);
    throw error;
  }
};

export const getChatById = async (chatId, userId) => {
  try {
    console.log('Fetching chat by ID:', chatId);
    const response = await fetch(`/api/chat/${chatId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch chat. Status: ${response.status}`);
    }

    const chatData = await response.json();
    console.log('Raw chat data:', chatData);
    
    // Find other user from participants
    const otherParticipant = chatData.participants.find(p => p.userId !== userId);
    
    if (!otherParticipant) {
      throw new Error('Could not find other participant in chat');
    }

    // Transform the data to match frontend structure
    return {
      id: chatData.chatId,
      participants: chatData.participants.map(p => ({
        id: p.userId,
        displayName: p.displayName,
        profilePicture: p.profilePicture,
        isOnline: p.isOnline || false,
        lastSeen: p.lastSeen,
        email: p.email
      })),
      messages: chatData.messages.map(msg => ({
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
        uid: otherParticipant.userId,
        name: otherParticipant.displayName,
        email: otherParticipant.email || '',
        photoURL: otherParticipant.profilePicture,
        isOnline: otherParticipant.isOnline || false,
        lastSeen: otherParticipant.lastSeen
      }
    };
  } catch (error) {
    console.error('Get chat by ID error:', error);
    throw error;
  }
};

export const sendChatMessage = async (chatId, content, messageType = 'text') => {
  // Remove 'temp_' prefix if it exists
  const actualChatId = chatId.startsWith('temp_') ? chatId.replace('temp_', '') : chatId;
  
  try {
    const response = await fetch(`/api/chat/${actualChatId}/message`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
      },
      body: JSON.stringify({ content, messageType })
    });

    if (!response.ok) {
      throw new Error(`Failed to send message. Status: ${response.status}`);
    }

    const data = await response.json();
    return {
      id: data._id,
      messages: data.messages.map(msg => ({
        id: msg._id,
        content: msg.content,
        messageType: msg.messageType,
        sender: msg.sender,
        timestamp: new Date(msg.createdAt),
        readBy: msg.readBy
      })),
      lastMessage: data.lastMessage
    };
  } catch (error) {
    console.error('Send message error:', error);
    throw error;
  }
};

export const deleteMessage = async (chatId, messageId) => {
  try {
    const response = await fetch(`/api/chat/${chatId}/message/${messageId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete message. Status: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('Delete message error:', error);
    throw error;
  }
};