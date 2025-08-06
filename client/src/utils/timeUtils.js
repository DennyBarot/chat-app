// Utility functions for relative time display like Instagram
export const getRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  
  const now = new Date();
  const messageTime = new Date(timestamp);
  const diffInMs = now - messageTime;
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInWeeks = Math.floor(diffInDays / 7);

  if (diffInSeconds < 30) return 'seen just now';
  if (diffInMinutes < 1) return 'seen just now';
  if (diffInMinutes === 1) return 'seen 1m ago';
  if (diffInMinutes < 60) return `seen ${diffInMinutes}m ago`;
  if (diffInHours === 1) return 'seen 1h ago';
  if (diffInHours < 24) return `seen ${diffInHours}h ago`;
  if (diffInDays === 1) return 'seen 1d ago';
  if (diffInDays < 7) return `seen ${diffInDays}d ago`;
  if (diffInWeeks === 1) return 'seen 1w ago';
  if (diffInWeeks < 4) return `seen ${diffInWeeks}w ago`;
  if (diffInDays < 30) return `seen ${Math.floor(diffInDays)}d ago`;
  return `seen ${Math.floor(diffInDays / 30)}mo ago`;
};

// Check if message is read by the receiver
export const isMessageRead = (message, currentUserId) => {
  if (!message || !message.readBy) return false;
  return message.readBy.some(userId => userId !== currentUserId);
};

// Get the read time for a message
export const getReadTime = (message, currentUserId) => {
  if (!message || !message.readBy || !Array.isArray(message.readBy)) return null;
  
  // Find when the receiver read the message
  const receiverRead = message.readBy.find(userId => userId !== currentUserId);
  if (!receiverRead) return null;
  
  // For now, we'll use the message's updatedAt as read time
  // In a real implementation, you might want to store actual read timestamps
  return message.updatedAt || message.createdAt;
};
