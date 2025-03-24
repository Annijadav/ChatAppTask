import { auth } from "./firebase-config";

// Only export auth-related functionality
export { auth };

// Remove all Firestore related functions
export const initializeChat = async (userId1, userId2) => {
  console.warn('Firebase chat initialization is deprecated');
  return null;
};

export const getChatMessages = (chatId, callback) => {
  console.warn('Firebase chat messages are deprecated');
  return () => {}; // Return empty cleanup function
};

export const getUserChats = async (userId) => {
  console.warn('Firebase user chats are deprecated');
  return [];
};

export const searchUsersByEmail = async (email) => {
  console.warn('Firebase user search is deprecated');
  return [];
};
