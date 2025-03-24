# Socket.IO API Documentation

## Connection Setup

### Establishing Connection
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: 'your_jwt_token' // Required for authentication
  }
});

// Handle connection events
socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});
```

## Available Events

### 1. Online Status

#### Get Online Users
```javascript
// Emit event to get online users
socket.emit('getOnlineUsers');

// Listen for response
socket.on('onlineUsersList', (users) => {
  console.log('Online users:', users);
  // Sample response:
  // [{
  //   _id: "user_id",
  //   displayName: "John Doe",
  //   profilePicture: "url"
  // }]
});
```

#### User Status Updates
```javascript
// Listen for user online status
socket.on('userOnline', (user) => {
  console.log('User came online:', user);
  // {
  //   userId: "user_id",
  //   displayName: "John Doe",
  //   profilePicture: "url"
  // }
});

socket.on('userOffline', (user) => {
  console.log('User went offline:', user);
  // {
  //   userId: "user_id",
  //   lastSeen: "2024-01-20T10:30:00Z"
  // }
});
```

### 2. Chat Room Management

#### Join Chat
```javascript
// Join a chat room
socket.emit('joinChat', chatId); // or { chatId: 'chat_id' }

// Listen for join confirmation
socket.on('userJoinedChat', (data) => {
  console.log('User joined chat:', data);
  // {
  //   chatId: "chat_id",
  //   user: {
  //     _id: "user_id",
  //     displayName: "John Doe"
  //   }
  // }
});
```

#### Leave Chat
```javascript
// Leave a chat room
socket.emit('leaveChat', chatId); // or { chatId: 'chat_id' }

// Listen for leave notifications
socket.on('userLeftChat', (data) => {
  console.log('User left chat:', data);
  // {
  //   chatId: "chat_id",
  //   userId: "user_id"
  // }
});
```

### 3. Messaging

#### Send Message
```javascript
// Send a message
socket.emit('sendMessage', {
  chatId: 'chat_id',
  content: 'Hello!',
  messageType: 'text' // 'text', 'image', or 'file'
});

// Listen for new messages
socket.on('newMessage', (data) => {
  console.log('New message:', data);
  // {
  //   chatId: "chat_id",
  //   message: {
  //     _id: "message_id",
  //     sender: {
  //       _id: "user_id",
  //       displayName: "John Doe",
  //       profilePicture: "url"
  //     },
  //     content: "Hello!",
  //     messageType: "text",
  //     readBy: [{
  //       user: "user_id",
  //       readAt: "2024-01-20T10:30:00Z"
  //     }],
  //     createdAt: "2024-01-20T10:30:00Z"
  //   }
  // }
});
```

### 4. Typing Indicators

#### Typing Status
```javascript
// Emit typing start
socket.emit('typing', { chatId: 'chat_id' });

// Emit typing stop
socket.emit('typingStop', { chatId: 'chat_id' });

// Listen for typing indicators
socket.on('typing', (data) => {
  console.log('User is typing:', data);
  // {
  //   chatId: "chat_id",
  //   userId: "user_id"
  // }
});

socket.on('typingStop', (data) => {
  console.log('User stopped typing:', data);
  // {
  //   chatId: "chat_id",
  //   userId: "user_id"
  // }
});
```

### 5. Read Receipts

#### Mark Message as Read
```javascript
// Mark message as read
socket.emit('messageRead', {
  chatId: 'chat_id',
  messageId: 'message_id'
});

// Listen for read receipts
socket.on('messageRead', (data) => {
  console.log('Message read:', data);
  // {
  //   chatId: "chat_id",
  //   messageId: "message_id",
  //   userId: "user_id"
  // }
});
```

## Error Handling

```javascript
// Listen for error events
socket.on('error', (error) => {
  console.error('Socket error:', error);
  // {
  //   message: "Error message",
  //   details: "Optional error details"
  // }
});
```

## Best Practices

1. **Authentication**
   - Always include the JWT token in the connection auth
   - Handle authentication errors appropriately

2. **Connection Management**
   - Implement reconnection logic
   - Clean up listeners when components unmount

3. **Error Handling**
   - Always listen for the 'error' event
   - Implement proper error feedback in the UI

4. **Performance**
   - Remove event listeners when leaving chat rooms
   - Implement proper cleanup on component unmount

## Example Implementation

```javascript
class ChatService {
  constructor(token) {
    this.socket = io('http://localhost:5000', {
      auth: { token }
    });
    this.setupListeners();
  }

  setupListeners() {
    this.socket.on('connect', () => {
      console.log('Connected to chat server');
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  joinChat(chatId) {
    this.socket.emit('joinChat', chatId);
  }

  sendMessage(chatId, content) {
    this.socket.emit('sendMessage', {
      chatId,
      content,
      messageType: 'text'
    });
  }

  cleanup() {
    this.socket.disconnect();
  }
}
```

## Common Issues and Solutions

1. **Connection Issues**
   - Ensure CORS is properly configured
   - Verify JWT token is valid
   - Check server URL is correct

2. **Message Handling**
   - Validate chatId before sending messages
   - Handle offline scenarios
   - Implement message queuing if needed

3. **Real-time Updates**
   - Implement proper state management
   - Handle race conditions
   - Update UI optimistically
