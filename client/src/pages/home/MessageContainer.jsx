import React, { useState, useEffect, useRef } from "react";
import User from "./User";
import Message from "./Message";
import DateSeparator from "./DateSeparator";
import { useDispatch, useSelector } from "react-redux";
import { getMessageThunk, markMessagesReadThunk } from "../../store/slice/message/message.thunk";
import { messagesRead } from "../../store/slice/message/message.slice";
import { useSocket } from "../../context/SocketContext";
import SendMessage from "./SendMessage";
import { useLocation } from "react-router-dom";
import { format, isToday, isTomorrow, parseISO } from "date-fns";

const getDateLabel = (dateString) => {
  const date = parseISO(dateString);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "dd MMM yyyy");
};

const MessageContainer = ({ onBack, isMobile }) => {
  const dispatch = useDispatch();
  const { userProfile, selectedUser } = useSelector((state) => state.userReducer || { userProfile: null, selectedUser: null });
  const socket = useSocket();

  // Get messages from Redux
  const messages = useSelector((state) => state.messageReducer.messages);

  // Filter messages for the current conversation (if needed)
  const filteredMessages = useMemo(
    () =>
      Array.isArray(messages) && selectedUser && selectedUser._id
        ? messages.filter((msg) => msg.senderId === selectedUser._id || msg.receiverId === selectedUser._id)
        : messages,
    [messages, selectedUser]
  );

  // Prepare reply message state
  const [replyMessage, setReplyMessage] = useState(null);
  const handleReply = (message) => setReplyMessage(message);
  const handleCancelReply = () => setReplyMessage(null);

  // Get conversations for conversation ID lookup
  const { conversations } = useSelector((state) => state.messageReducer || { conversations: [] });

  // Find the conversation ID for the selected user
  const selectedConversationId = useMemo(() => {
    if (!selectedUser || !conversations) return null;
    const conversation = conversations.find((conv) => conv.participants.some((p) => p._id === selectedUser._id));
    return conversation?._id;
  }, [selectedUser, conversations]);

  const location = useLocation();
  const messagesEndRef = useRef(null);

  // Mark messages as read and sync "viewed" status on initial load, url change, or user change
  useEffect(() => {
    if (!selectedUser?._id || location.pathname === "/login" || location.pathname === "/signup") return;

    const markAsRead = async () => {
      const action = await dispatch(getMessageThunk({ otherParticipantId: selectedUser._id }));
      if (getMessageThunk.fulfilled.match(action)) {
        const messages = Array.isArray(action.payload.responseData) ? action.payload.responseData : action.payload;
        const conversationId = messages[0]?.conversationId;
        if (conversationId && socket) {
          socket.emit("viewConversation", { conversationId, userId: userProfile?._id });
          await dispatch(markMessagesReadThunk({ conversationId }));
          dispatch(getMessageThunk({ otherParticipantId: selectedUser._id }));
        }
      }
    };
    markAsRead();
  }, [selectedUser, location, dispatch, socket, userProfile?._id]);

  // Handle "messagesRead" custom events from SocketContext
  useEffect(() => {
    const handleMessagesRead = (event) => {
      const { messageIds, readBy, readAt } = event.detail;
      dispatch(messagesRead({ messageIds, readBy, readAt }));
    };
    window.addEventListener("messagesRead", handleMessagesRead);
    return () => window.removeEventListener("messagesRead", handleMessagesRead);
  }, [dispatch]);

  // Mark messages as read on visibility/focus changes
  useEffect(() => {
    if (!selectedConversationId) return;
    const handleVisibilityChange = () => {
      if (!document.hidden && selectedConversationId) {
        dispatch(markMessagesReadThunk({ conversationId: selectedConversationId }));
        socket?.emit("viewConversation", { conversationId: selectedConversationId, userId: userProfile?._id });
      }
    };
    const handleFocus = () => {
      if (selectedConversationId) {
        dispatch(markMessagesReadThunk({ conversationId: selectedConversationId }));
        socket?.emit("viewConversation", { conversationId: selectedConversationId, userId: userProfile?._id });
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [selectedConversationId, dispatch, socket, userProfile?._id]);

  // Sync real-time messages for the current conversation
  useEffect(() => {
    if (!socket || !selectedUser?._id || !selectedConversationId) return;
    const handleNewMessage = (newMessage) => {
      if (newMessage.conversationId === selectedConversationId) {
        dispatch(getMessageThunk({ otherParticipantId: selectedUser._id }));
        dispatch(markMessagesReadThunk({ conversationId: selectedConversationId }));
      }
    };
    socket.on("newMessage", handleNewMessage);
    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, [socket, selectedUser, dispatch, selectedConversationId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, [filteredMessages, selectedUser]);

  // Listen for typing indicators from server
  const [typingUsers, setTypingUsers] = useState({});
  useEffect(() => {
    if (!socket || !userProfile?._id) return;

    const handleUserTyping = ({ conversationId, userId, isTyping }) => {
      if (isTyping) {
        setTypingUsers(prev => ({
          ...prev,
          [conversationId]: [...(prev[conversationId] || []), userId].filter(
            (id, index, arr) => arr.indexOf(id) === index
          )
        }));
      } else {
        setTypingUsers(prev => ({
          ...prev,
          [conversationId]: (prev[conversationId] || []).filter(id => id !== userId)
        }));
      }
    };

    socket.on('userTyping', handleUserTyping);
    return () => {
      socket.off('userTyping', handleUserTyping);
    };
  }, [socket, userProfile?._id]);

  // Prepare the sorted, grouped message list with date separators and last-message logic
  const safeMessages = Array.isArray(filteredMessages) ? filteredMessages : [];
  const sortedMessages = [...safeMessages].sort((a, b) => {
    const dateA = new Date(a.createdAt || a.timestamp);
    const dateB = new Date(b.createdAt || b.timestamp);
    return dateA - dateB;
  });

  const messagesWithSeparators = [];
  let lastDate = null;

  const lastMessageIdx = sortedMessages.length - 1;
  sortedMessages.forEach((message, idx) => {
    const messageDate = message.createdAt || message.timestamp;
    if (messageDate) {
      const currentDate = messageDate.split("T")[0];
      if (lastDate !== currentDate) {
        messagesWithSeparators.push({
          type: "date-separator",
          id: `separator-${currentDate}`,
          label: getDateLabel(messageDate),
        });
        lastDate = currentDate;
      }
    }
    messagesWithSeparators.push({
      type: "message",
      id: message._id,
      messageDetails: message,
      isLastMessage: idx === lastMessageIdx,
    });
  });

  // Typing indicator display logic
  const { participants } = conversations.find(conv => conv._id === selectedConversationId) || {};
  const showTypingIndicator = (
    !!typingUsers[selectedConversationId]?.length &&
    !typingUsers[selectedConversationId].includes(userProfile?._id) // Don't show "You are typing"
  );

  // Map participant IDs to names for the typing indicator
  // You may want to memoize or optimize this lookup for large conversations
  const getParticipantName = (userId) =>
    participants?.find(p => p._id === userId)?.fullName || 'Someone';

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-800 relative">
      {isMobile && (
        <button
          onClick={onBack}
          aria-label="Back"
          title="Back"
          className="absolute top-2 left-2 z-20 p-1 rounded-full bg-indigo-600 text-white shadow-md hover:bg-indigo-700 transition-colors flex items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      {selectedUser ? (
        <>
          {/* Header */}
          <div className="p-4 border-b border-slate-200 bg-purple- shadow-sm  dark:from-slate-800 dark:to-slate-900 ">
            <User userDetails={selectedUser} showUnreadCount={false} />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-slate-50 to-white  dark:from-slate-800 dark:to-slate-900">
            {messages?.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-slate-700">No messages yet</h3>
                <p className="text-slate-500 mt-2 text-center">Send a message to start the conversation with {selectedUser.fullName}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Typing indicator */}
                {showTypingIndicator && (
                  <div className="px-4 py-1 text-xs text-slate-500 animate-pulse">
                    {typingUsers[selectedConversationId]
                      .map(id => getParticipantName(id))
                      .join(', ')}{' '}
                    is typing...
                  </div>
                )}
                {messagesWithSeparators.map((item, index) => {
                  if (item.type === "date-separator") {
                    return <DateSeparator key={item.id} label={item.label} />;
                  } else if (item.type === "message") {
                    // Find the last actual message (not date separator)
                    const lastMessageIndex = messagesWithSeparators
                      .map((item, idx) => ({ ...item, originalIndex: idx }))
                      .filter(item => item.type === "message")
                      .pop()?.originalIndex;
                    const isLastMessage = index === lastMessageIndex;
                    return (
                      <Message
                        key={item.id}
                        messageDetails={item.messageDetails}
                        onReply={handleReply}
                        isLastMessage={isLastMessage}
                      />
                    );
                  }
                  return null;
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Send Message */}
          <SendMessage
            replyMessage={replyMessage}
            onCancelReply={() => setReplyMessage(null)}
          />
        </>
      ) : (
        <div className="h-full flex items-center justify-center flex-col gap-5 bg-gradient-to-br from-indigo-50 to-white p-8">
          <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <User userDetails={selectedUser} showUnreadCount={false} />
          </div>
          <h2 className="text-3xl font-bold text-indigo-700">Welcome to CHAT APP</h2>
          <p className="text-xl text-slate-600 text-center max-w-md">Select a conversation from the sidebar or add a new contact to start chatting</p>
          <button
            onClick={() => document.querySelector('[title="Add new conversation"]').click()}
            className="mt-4 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
            </svg>
            Add New Contact
          </button>
        </div>
      )}
    </div>
  );
};

export default MessageContainer;
