import { io } from 'socket.io-client';

let socket = null;
let connectedUsers = new Set();
let activeChats = new Set();
let connectionAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;
const INITIAL_TIMEOUT = 10000; // Increase timeout to 10 seconds
const SOCKET_RECONNECT_ATTEMPTS = 5;
const SOCKET_RECONNECT_DELAY = 2000;

// Add connection state tracking
let connectionState = {
  isConnecting: false,
  lastAttempt: null,
  currentSocket: null
};

// Normalize user ID to ensure consistency between client and server
export const normalizeUserId = (user) => {
  if (!user) return null;
  
  return {
    _id: user.id || user.id,
    firebaseUid: user.firebaseUid || user.id || user.id, 
    displayName: user.displayName || user.name || 'Unknown',
    profilePicture: user.profilePicture || user.photoURL
  };
};

// Get current user from localStorage with better error handling
const getCurrentUser = () => {
  try {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('jwt_token');
    
    if (!userData || !token) {
      console.warn('Missing user data or token');
      return null;
    }

    const user = JSON.parse(userData);
    
    // Ensure user has required fields
    const normalizedUser = {
      id: user.id || user.id,  // Keep original id
      firebaseUid: user.firebaseUid || user.id || user.id,
      displayName: user.displayName || user.name || user.email,
      email: user.email,
      profilePicture: user.profilePicture || user.photoURL
    };

    console.log('Normalized user data:', normalizedUser);
    return normalizedUser;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

// Add socket event constants
const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  MESSAGE: 'newMessage',
  MESSAGE_READ: 'messageRead',
  USER_ONLINE: 'userOnline',
  USER_OFFLINE: 'userOffline',
  USER_AWAY: 'userAway',
  ERROR: 'error'
};

// Enhance socket event listeners setup
function setupSocketEventListeners(socket, user) {
  if (!socket) return;

  // Connection events
  socket.on(SOCKET_EVENTS.CONNECT, () => {
    console.log('Socket connected with ID:', socket.id);
    socket.emit('getOnlineUsers'); // Request initial online users list
    rejoinActiveChats(socket, user);
  });

  // User status events
  socket.on(SOCKET_EVENTS.USER_ONLINE, (data) => {
    console.log('User came online:', data);
    dispatchEvent('userStatusChange', { userId: data.userId, status: true });
  });

  socket.on(SOCKET_EVENTS.USER_OFFLINE, (data) => {
    console.log('User went offline:', data);
    dispatchEvent('userStatusChange', { userId: data.userId, status: false });
  });

  socket.on(SOCKET_EVENTS.USER_AWAY, (data) => {
    console.log('User away:', data);
    dispatchEvent('userStatusChange', { userId: data.userId, status: false });
  });

  // Error handling
  socket.on(SOCKET_EVENTS.ERROR, (error) => {
    console.error('Socket error:', error);
    handleSocketError(error);
  });

  // Add activity tracking
  let activityTimeout;
  const resetActivityTimeout = () => {
    if (activityTimeout) clearTimeout(activityTimeout);
    socket.emit('userActive');
    
    activityTimeout = setTimeout(() => {
      socket.emit('userInactive');
    }, 300000); // 5 minutes
  };

  // Track user activity
  if (typeof window !== 'undefined') {
    ['mousedown', 'keydown', 'mousemove', 'touchstart'].forEach(event => {
      window.addEventListener(event, resetActivityTimeout);
    });
  }

  return () => {
    if (typeof window !== 'undefined') {
      ['mousedown', 'keydown', 'mousemove', 'touchstart'].forEach(event => {
        window.removeEventListener(event, resetActivityTimeout);
      });
    }
    if (activityTimeout) clearTimeout(activityTimeout);
  };
}

// Handle socket errors
function handleSocketError(error) {
  console.error('Socket error:', error);
  if (error.type === 'AUTHENTICATION_ERROR') {
    localStorage.removeItem('jwt_token');
    window.location.href = '/login';
  }
}

// Rejoin active chats after reconnection
async function rejoinActiveChats(socket, user) {
  if (!socket || !user) return;
  
  if (activeChats.size > 0) {
    console.log('Rejoining active chats:', Array.from(activeChats));
    activeChats.forEach(chatId => {
      socket.emit('joinChat', { 
        chatId, 
        userId: user.id,
        firebaseUid: user.firebaseUid 
      });
    });
  }
}

// Enhanced socket initialization
export const initializeSocket = async () => {
  try {
    if (socket?.connected) {
      console.log('Reusing existing socket connection');
      return socket;
    }

    const user = getCurrentUser();
    const token = localStorage.getItem('jwt_token');

    console.log('Initializing socket with:', {
      user: user ? 'Present' : 'Missing',
      token: token ? 'Present' : 'Missing'
    });

    if (!token || !user?.id) {
      throw new Error('Missing authentication data');
    }

    // Debug token before connection
    debugToken();

    const socketURL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
    
    if (socket) {
      console.log('Cleaning up existing socket');
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    }

    console.log('Creating new socket connection to:', socketURL);
    
    socket = io(socketURL, {
      auth: {
        token,
        userId: user.id,
        firebaseUid: user.firebaseUid
      },
      transports: ['websocket', 'polling'], // Allow fallback to polling
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      forceNew: true
    });

    return new Promise((resolve, reject) => {
      const connectTimeout = setTimeout(() => {
        console.error('Socket connection timed out');
        if (socket) {
          socket.disconnect();
          socket = null;
        }
        reject(new Error('Connection timeout'));
      }, 20000);

      socket.on('connect_error', (error) => {
        console.error('Socket connect error:', error.message);
        clearTimeout(connectTimeout);
        reject(error);
      });

      socket.on('error', (error) => {
        console.error('Socket error event:', error);
      });

      socket.once('connect', () => {
        console.log('Socket connected successfully:', socket.id);
        clearTimeout(connectTimeout);
        setupSocketEventListeners(socket, user);
        resolve(socket);
      });

      socket.connect();
    });
  } catch (error) {
    console.error('Socket initialization error:', error);
    return null;
  }
};

// Enhanced join chat with retries
export const joinChat = async (chatId, timeout = 20000) => {
  try {
    if (!chatId) throw new Error('Invalid chat ID');

    const user = getCurrentUser();
    if (!user?.id) throw new Error('Invalid user data');

    let currentSocket = await initializeSocket();
    if (!currentSocket?.connected) {
      throw new Error('Socket not connected');
    }

    return new Promise((resolve, reject) => {
      let ackReceived = false;
      let resolved = false;

      const joinTimeout = setTimeout(() => {
        if (!ackReceived && !resolved) {
          currentSocket.off('joinChatAck');
          reject(new Error('Join chat operation timed out'));
        }
      }, timeout);

      // Handle both callback and event acknowledgment
      currentSocket.emit('joinChat', {
        chatId,
        userId: user.id,
        firebaseUid: user.firebaseUid
      }, (response) => {
        if (resolved) return;
        if (response?.success) {
          resolved = true;
          clearTimeout(joinTimeout);
          activeChats.add(chatId);
          resolve(true);
        } else if (response?.error) {
          resolved = true;
          clearTimeout(joinTimeout);
          reject(new Error(response.error));
        }
      });

      // Fallback to event-based acknowledgment
      currentSocket.once('joinChatAck', (response) => {
        if (resolved) return;
        clearTimeout(joinTimeout);
        ackReceived = true;
        resolved = true;
        
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          activeChats.add(chatId);
          resolve(true);
        }
      });
    });

  } catch (error) {
    console.error('Join chat error:', error);
    return false;
  }
};

// Leave chat with better connection handling
export const leaveChat = async (chatId) => {
  try {
    let currentSocket = socket;
    if (!currentSocket?.connected) {
      console.log('Socket disconnected, attempting to reconnect...');
      currentSocket = await initializeSocket();
    }

    if (!currentSocket?.connected) {
      console.warn('Unable to establish socket connection - skipping leave chat');
      activeChats.delete(chatId);
      return false;
    }
    
    activeChats.delete(chatId);
    currentSocket.emit('leaveChat', { chatId });
    console.log('Successfully left chat:', chatId);
    return true;
  } catch (error) {
    console.error('Error leaving chat:', error);
    return false;
  }
};

// Enhanced message sending with acknowledgment
export const sendMessage = async (chatId, content, messageType = 'text') => {
  return new Promise(async (resolve, reject) => {
    try {
      const user = getCurrentUser();
      if (!user) throw new Error('User data missing');

      let currentSocket = socket;
      if (!currentSocket?.connected) {
        currentSocket = await initializeSocket();
      }

      if (!currentSocket?.connected) {
        throw new Error('Could not establish socket connection');
      }

      const messageData = {
        chatId,
        content,
        messageType,
        sender: {
          userId: user.id,
          firebaseUid: user.firebaseUid,
          displayName: user.displayName,
          profilePicture: user.profilePicture
        }
      };

      // Add acknowledgment callback
      currentSocket.emit('sendMessage', messageData, (response) => {
        if (response?.error) {
          console.error('Message send error:', response.error);
          reject(new Error(response.error));
        } else {
          console.log('Message sent successfully:', response);
          resolve(response);
        }
      });

    } catch (error) {
      console.error('Send message error:', error);
      reject(error);
    }
  });
};

// Add this new function to handle missed messages
export const requestMissedMessages = (chatId, lastMessageTime) => {
  if (!socket?.connected) return;
  
  socket.emit('getMissedMessages', {
    chatId,
    lastMessageTime: lastMessageTime || new Date(0).toISOString()
  });
};

// Typing status with better error handling
export const sendTypingStatus = (chatId, isTyping) => {
  try {
    const user = getCurrentUser();
    if (!socket || !socket.connected) {
      console.error('Socket not connected - cannot send typing status');
      return false;
    }
    
    if (!user) {
      console.error('User data not available - cannot send typing status');
      return false;
    }
    
    const event = isTyping ? 'typing' : 'typingStop';
    socket.emit(event, { 
      chatId,
      userId: user.id,
      firebaseUid: user.firebaseUid
    });
    console.log(`Emitting ${event} event for chat:`, chatId);
    return true;
  } catch (error) {
    console.error('Error sending typing status:', error);
    return false;
  }
};

// Mark message as read with better error handling
export const markMessageRead = (chatId, messageId) => {
  try {
    const user = getCurrentUser();
    if (!socket || !socket.connected) {
      console.error('Socket not connected - cannot mark message as read');
      return false;
    }
    
    if (!user) {
      console.error('User data not available - cannot mark message as read');
      return false;
    }

    socket.emit('messageRead', { 
      chatId, 
      messageId,
      userId: user.id,
      firebaseUid: user.firebaseUid
    });
    return true;
  } catch (error) {
    console.error('Error marking message as read:', error);
    return false;
  }
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    try {
      socket.disconnect();
      socket = null;
      console.log('Socket disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting socket:', error);
    }
  }
};

export const isUserOnline = (userId) => connectedUsers.has(userId);

// Enhanced socket status with more debug info
export const getSocketStatus = () => {
  const status = {
    initialized: !!socket,
    connected: socket?.connected || false,
    id: socket?.id || null,
    user: getCurrentUser()
  };
  
  console.log('Current socket status:', status);
  return status;
};

// Debug utility for token
export const debugToken = () => {
  try {
    const token = localStorage.getItem('jwt_token');
    if (!token) {
      console.warn('No token found in localStorage');
      return null;
    }
    
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('Token does not appear to be valid JWT (should have 3 parts)');
      return null;
    }
    
    const payload = JSON.parse(atob(parts[1]));
    console.log('JWT Token payload:', payload);
    
    const requiredFields = ['id', 'email', 'firebaseUid'];
    const missingFields = requiredFields.filter(field => !payload[field]);
    
    if (missingFields.length > 0) {
      console.warn('JWT is missing required fields:', missingFields);
    }
    
    return payload;
  } catch (error) {
    console.error('Error decoding JWT token:', error);
    return null;
  }
};