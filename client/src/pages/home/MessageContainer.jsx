import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import { FixedSizeList as List } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { useDispatch, useSelector } from "react-redux";
import { useSocket } from "../../context/SocketContext";
import { getMessageThunk } from "../../store/slice/message/message.thunk";
import { addMessage, messagesRead } from "../../store/slice/message/message.slice";
import SendMessage from "./SendMessage";
import Message from "./Message";
import DateSeparator from "./DateSeparator";
import User from "./User";
import { getAvatar } from "../../utils/stringUtils";
import Spinner from "../../components/Spinner";
import ErrorBoundary from "../../components/ErrorBoundary";

const MessageContainer = ({ onBack, isMobile }) => {
  const dispatch = useDispatch();
  const { userProfile, selectedUser } = useSelector((state) => state.userReducer);
  const { messages, conversations } = useSelector((state) => state.messageReducer);
  const socket = useSocket();
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const [replyMessage, setReplyMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch messages for selected user
  useEffect(() => {
    if (selectedUser?._id) {
      setIsLoading(true);
      dispatch(getMessageThunk({ otherParticipantId: selectedUser._id }))
        .finally(() => setIsLoading(false));
    }
  }, [selectedUser, dispatch]);

  // Get selected conversation ID
  const selectedConversationId = useMemo(() => {
    if (!selectedUser || !conversations) return null;
    const conversation = conversations.find((conv) =>
      conv.participants.some((p) => p._id === selectedUser._id)
    );
    return conversation?._id;
  }, [selectedUser, conversations]);

  // Filter and sort messages
  const filteredMessages = useMemo(() => {
    if (Array.isArray(messages) && selectedUser?._id) {
      return messages.filter(
        (msg) =>
          (msg.senderId === selectedUser._id || msg.receiverId === selectedUser._id)
      );
    }
    return [];
  }, [messages, selectedUser]);

  const sortedMessages = useMemo(() => {
    return [...filteredMessages].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.timestamp);
      const dateB = new Date(b.createdAt || b.timestamp);
      return dateA - dateB;
    });
  }, [filteredMessages]);

  // Add date separators
  const getDateLabel = useCallback((dateString) => {
    const date = parseISO(dateString);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "dd MMM yyyy");
  }, []);

  const messagesWithSeparators = useMemo(() => {
    const messagesWithSeparators = [];
    let lastDate = null;
    if (sortedMessages.length > 0) {
      sortedMessages.forEach((message, index) => {
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
        const nextMessage = sortedMessages[index + 1];
        const isLastInBlock = !nextMessage || nextMessage.senderId !== message.senderId;
        messagesWithSeparators.push({
          type: "message",
          id: message._id,
          messageDetails: message,
          isLastInBlock,
        });
      });
    }
    return messagesWithSeparators;
  }, [sortedMessages, getDateLabel]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto", block: "end" });
    }
  }, [sortedMessages]);

  // Real-time: handle incoming messages
  useEffect(() => {
    if (!socket || !selectedConversationId || !userProfile?._id) return;
    const handleNewMessage = (newMessage) => {
      if (newMessage.conversationId === selectedConversationId) {
        dispatch(addMessage(newMessage));
      }
    };
    socket.on("newMessage", handleNewMessage);
    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, [socket, selectedConversationId, dispatch, userProfile?._id]);

  // Real-time: mark messages as read
  useEffect(() => {
    const handleMessagesRead = (event) => {
      const { messageIds, readBy, readAt } = event.detail;
      dispatch(messagesRead({ messageIds, readBy, readAt }));
    };
    window.addEventListener("messagesRead", handleMessagesRead);
    return () => {
      window.removeEventListener("messagesRead", handleMessagesRead);
    };
  }, [dispatch]);

  // Emit 'viewConversation' on mount, tab focus, and visibility change
  useEffect(() => {
    if (selectedConversationId && socket && userProfile?._id) {
      const emitViewConversation = () => {
        socket.emit("viewConversation", {
          conversationId: selectedConversationId,
          userId: userProfile._id,
        });
      };
      emitViewConversation();
      const handleVisibilityChange = () => {
        if (!document.hidden) emitViewConversation();
      };
      const handleFocus = () => {
        emitViewConversation();
      };
      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("focus", handleFocus);
      return () => {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("focus", handleFocus);
      };
    }
  }, [selectedConversationId, socket, userProfile?._id]);

  // Handle reply
  const handleReply = useCallback((message) => {
    setReplyMessage(message);
    // Optionally: focus the message input after setting reply
  }, []);

  // Optimistic message send
  const handleSend = useCallback((content, replyToId) => {
    if (!userProfile?._id || !selectedConversationId) return;
    const tempId = Date.now().toString();
    const optimisticMessage = {
      _id: tempId,
      content,
      senderId: userProfile._id,
      receiverId: selectedUser._id,
      conversationId: selectedConversationId,
      createdAt: new Date().toISOString(),
      replyTo: replyToId,
      readBy: [userProfile._id],
    };
    dispatch(addMessage(optimisticMessage));
    // In a real app, you'd send via socket.io and confirm/replace on success
    // Here, we just immediately add the message for demo purposes
  }, [dispatch, userProfile?._id, selectedConversationId, selectedUser?._id]);

  // Render row in the virtualized list
  const MessageRow = useCallback(({ index, style, data }) => {
    const item = data[index];
    if (item.type === "date-separator") {
      return <DateSeparator key={item.id} label={item.label} style={style} />;
    } else if (item.type === "message") {
      return (
        <div key={item.id} style={style}>
          <Message
            messageDetails={item.messageDetails}
            onReply={handleReply}
            isLastInBlock={item.isLastInBlock}
          />
        </div>
      );
    }
    return null;
  }, [handleReply]);

  // Handle back button on mobile
  const handleBack = useCallback(() => {
    if (onBack) onBack();
  }, [onBack]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-800 relative">
      {isMobile && (
        <button
          onClick={handleBack}
          aria-label="Back"
          title="Back"
          className="absolute top-2 left-2 z-20 p-1 rounded-full bg-indigo-600 text-white shadow-md hover:bg-indigo-700 transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      {selectedUser ? (
        <>
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
            <User userDetails={selectedUser} showUnreadCount={false} />
          </div>
          <div className="flex-1 overflow-y-auto p-4" ref={containerRef}>
            <ErrorBoundary>
              {isLoading ? (
                <Spinner />
              ) : sortedMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                  <div className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center mb-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-10 w-10 text-indigo-500 dark:text-indigo-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-medium text-slate-700 dark:text-slate-300">
                    No messages yet
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 mt-2 text-center">
                    Send a message to start the conversation with {selectedUser.fullName}
                  </p>
                </div>
              ) : (
                <AutoSizer>
                  {({ height, width }) => (
                    <List
                      height={height}
                      width={width}
                      itemCount={messagesWithSeparators.length}
                      itemSize={120} // Adjust per your message row height
                      itemData={messagesWithSeparators}
                    >
                      {MessageRow}
                    </List>
                  )}
                </AutoSizer>
              )}
            </ErrorBoundary>
            <div ref={messagesEndRef} />
          </div>
          <SendMessage
            replyMessage={replyMessage}
            onCancelReply={() => setReplyMessage(null)}
            onSend={handleSend}
            // Optionally, focus message input on mount
            autoFocus={true}
          />
        </>
      ) : (
        <div className="h-full flex items-center justify-center flex-col gap-5 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900 dark:to-slate-800 p-8">
          <div className="w-24 h-24 rounded-full bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center mb-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 text-indigo-500 dark:text-indigo-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">
            Welcome to CHAT APP
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-300 text-center max-w-md">
            Select a conversation from the sidebar or add a new contact to start chatting
          </p>
          <button
            onClick={() =>
              document.querySelector('[title="Add new conversation"]')?.click()
            }
            className="mt-4 px-6 py-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            aria-label="Add new contact"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
            </svg>
            Add New Contact
          </button>
        </div>
      )}
    </div>
  );
};

MessageContainer.propTypes = {
  onBack: PropTypes.func,
  isMobile: PropTypes.bool,
};

export default MessageContainer;
