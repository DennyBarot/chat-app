import React, { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from "react";
import User from "./User";
import Message from "./Message";
import DateSeparator from "./DateSeparator";
import { useDispatch, useSelector } from "react-redux";
import { getMessageThunk, markMessagesReadThunk } from "../../store/slice/message/message.thunk";
import { messagesRead, setNewMessage } from "../../store/slice/message/message.slice";
import { useSocket } from "../../context/SocketContext";
import SendMessage from "./SendMessage";
import { useLocation } from "react-router-dom";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { setTyping } from "../../store/slice/typing/typing.slice";

const MessageContainer = ({ onBack, isMobile }) => {
  const dispatch = useDispatch();
  const { userProfile, selectedUser } = useSelector((state) => state.userReducer || { userProfile: null, selectedUser: null });
  const socket = useSocket();

  const messages = useSelector((state) => state.messageReducer.messages);
  const typingUsers = useSelector((state) => state.typingReducer.typingUsers);

  const [replyMessage, setReplyMessage] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isInitialScrolling, setIsInitialScrolling] = useState(true);
  const [allMessages, setAllMessages] = useState([]); // To store all messages

  const scrollRef = useRef(null); // Ref for the scrollable div
  const messagesEndRef = useRef(null);
  const prevScrollHeightRef = useRef(0);
  const isInitialLoadRef = useRef(true);

  const filteredMessages = useMemo(() => {
    if (Array.isArray(allMessages) && selectedUser?._id) {
      return allMessages.filter(
        (msg) =>
          msg.senderId === selectedUser._id || msg.receiverId === selectedUser._id
      );
    }
    return allMessages;
  }, [allMessages, selectedUser]);

  const location = useLocation();

  const handleReply = useCallback((message) => setReplyMessage(message), []);
  const { conversations } = useSelector((state) => state.messageReducer);

  const selectedConversationId = useMemo(() => {
    if (!selectedUser || !conversations) return null;
    const conversation = conversations.find(conv =>
      conv.participants.some(p => p._id === selectedUser._id)
    );
    return conversation?._id;
  }, [selectedUser, conversations]);

  // Effect to fetch initial messages or when selectedUser changes
  useEffect(() => {
    isInitialLoadRef.current = true; // Reset for new conversation
    const fetchMessages = async () => {
      if (!selectedUser?._id || location.pathname === '/login' || location.pathname === '/signup') {
        setAllMessages([]); // Clear messages if no user selected or on auth pages
        setCurrentPage(1);
        setHasMoreMessages(true);
        return;
      }

      setIsLoadingMessages(true);
      setIsInitialScrolling(true);
      try {
        const action = await dispatch(getMessageThunk({ otherParticipantId: selectedUser._id, page: 1, limit: 20 }));

        if (getMessageThunk.fulfilled.match(action) && action.payload) {
          const { messages: fetchedMessages, hasMore, totalMessages } = action.payload;
          setAllMessages(fetchedMessages || []);
          setHasMoreMessages(hasMore);
          setCurrentPage(1); // Reset to first page

          if (fetchedMessages?.length > 0) {
            const conversationId = fetchedMessages[0].conversationId;
            if (conversationId && socket) {
              socket.emit('viewConversation', {
                conversationId: conversationId,
                userId: userProfile?._id
              });
              await dispatch(markMessagesReadThunk({ conversationId: conversationId }));
            }
          }
          // Initial scroll will be handled by a separate useEffect
        }
      } catch (error) {
        console.error("Failed to fetch messages:", error);
        setAllMessages([]);
        setHasMoreMessages(false);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [selectedUser, location, dispatch, socket, userProfile?._id]);

  // Effect for infinite scrolling
  useEffect(() => {
    const currentScrollRef = scrollRef.current;
    if (!currentScrollRef) return;

    const handleScroll = async () => {
      if (currentScrollRef.scrollTop === 0 && hasMoreMessages && !isLoadingMessages && !isInitialScrolling) {
        setIsLoadingMessages(true);
        const nextPage = currentPage + 1;

        // Store current scroll height before fetching new messages
        prevScrollHeightRef.current = currentScrollRef.scrollHeight;

        try {
          const action = await dispatch(getMessageThunk({ otherParticipantId: selectedUser._id, page: nextPage, limit: 20 }));

          if (getMessageThunk.fulfilled.match(action) && action.payload) {
            const { messages: newFetchedMessages, hasMore } = action.payload;
            setAllMessages(prevMessages => [...newFetchedMessages, ...prevMessages]); // Prepend new messages
            setHasMoreMessages(hasMore);
            setCurrentPage(nextPage);
          }
        } catch (error) {
          console.error("Failed to fetch more messages:", error);
        } finally {
          setIsLoadingMessages(false);
        }
      }
    };

    currentScrollRef.addEventListener('scroll', handleScroll);

    return () => {
      currentScrollRef.removeEventListener('scroll', handleScroll);
    };
  }, [currentPage, hasMoreMessages, isLoadingMessages, selectedUser, dispatch, isInitialScrolling]);

  // useLayoutEffect to adjust scroll position after new messages are prepended
  useLayoutEffect(() => {
    const currentScrollRef = scrollRef.current;
    // Only adjust scroll if we just loaded more messages (currentPage > 1)
    // and not during the initial load (isLoadingMessages is false after fetch)
    if (currentScrollRef && !isLoadingMessages && currentPage > 1) {
      const newScrollHeight = currentScrollRef.scrollHeight;
      const scrollDifference = newScrollHeight - prevScrollHeightRef.current;
      currentScrollRef.scrollTop += scrollDifference;
    }
  }, [allMessages, isLoadingMessages, currentPage]); // Trigger when allMessages updates after loading more

  // useLayoutEffect to handle initial scroll to bottom
  useLayoutEffect(() => {
    // On initial load for a selected user with messages, scroll to the bottom.
    if (isInitialLoadRef.current && selectedUser?._id && allMessages.length > 0) {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
      // Mark the initial load and scroll as complete.
      isInitialLoadRef.current = false;
      setIsInitialScrolling(false);
    }
  }, [selectedUser, allMessages]);

  useEffect(() => {
    const handleMessagesRead = (event) => {
      const { messageIds, readBy, readAt } = event.detail;
      dispatch(messagesRead({ messageIds, readBy, readAt }));
    };

    window.addEventListener('messagesRead', handleMessagesRead);

    return () => {
      window.removeEventListener('messagesRead', handleMessagesRead);
    };
  }, [dispatch]);

  useEffect(() => {
    if (!selectedConversationId) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        dispatch(markMessagesReadThunk({ conversationId: selectedConversationId }));
        socket?.emit('viewConversation', {
          conversationId: selectedConversationId,
          userId: userProfile?._id
        });
      }
    };

    const handleFocus = () => {
      dispatch(markMessagesReadThunk({ conversationId: selectedConversationId }));
      socket?.emit('viewConversation', {
        conversationId: selectedConversationId,
        userId: userProfile?._id
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [selectedConversationId, dispatch, socket, userProfile?._id]);

  useEffect(() => {
    if (!socket || !selectedUser?._id || !selectedConversationId) return;

    const handleNewMessage = (newMessage) => {
      if (newMessage.conversationId === selectedConversationId) {
        console.log(
          "MessageContainer.jsx: Received newMessage for current chat, adding to state and marking as read."
        );
        dispatch(setNewMessage(newMessage)); // Directly add new message to state
        // When a new message arrives, we should add it to allMessages and scroll to bottom
        setAllMessages(prevMessages => [...prevMessages, newMessage]);
        dispatch(markMessagesReadThunk({ conversationId: selectedConversationId }));
        // Manually scroll to bottom
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }
    };

    socket.on("newMessage", handleNewMessage);

    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, [socket, selectedUser, dispatch, selectedConversationId]);

  useEffect(() => {
    if (!socket) return;

    const handleTyping = ({ senderId, receiverId }) => {
      if (receiverId === userProfile?._id && senderId === selectedUser?._id) {
        dispatch(setTyping({ userId: senderId, isTyping: true }));
      }
    };

    const handleStopTyping = ({ senderId, receiverId }) => {
      if (receiverId === userProfile?._id && senderId === selectedUser?._id) {
        dispatch(setTyping({ userId: senderId, isTyping: false }));
      }
    };

    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);

    return () => {
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
    };
  }, [socket, dispatch, userProfile, selectedUser]);

  // Keep scroll at bottom when new messages arrive (from socket or sending)
  // This useEffect will now only run when `messagesEndRef` is available,
  // and we will manually trigger scroll when new messages arrive.
  useEffect(() => {
    // No automatic scroll here. We'll handle it manually.
  }, []); // Empty dependency array, runs once on mount

  const getDateLabel = useCallback((dateString) => {
    const date = parseISO(dateString);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "dd MMM yyyy");
  }, []);

  const messagesWithSeparators = useMemo(() => {
    const safeMessages = Array.isArray(filteredMessages) ? filteredMessages : [];
    const sortedMessages = [...safeMessages].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.timestamp);
      const dateB = new Date(b.createdAt || b.timestamp);
      return dateA - dateB;
    });

    const result = [];
    let lastDate = null;

    if (sortedMessages.length > 0) {
      sortedMessages.forEach((message) => {
        const messageDate = message.createdAt || message.timestamp;
        if (messageDate) {
          const currentDate = messageDate.split("T")[0];
          if (lastDate !== currentDate) {
            result.push({
              type: "date-separator",
              id: `separator-${currentDate}`,
              label: getDateLabel(messageDate),
            });
            lastDate = currentDate;
          }
        }
        result.push({
          type: "message",
          id: message._id,
          messageDetails: message,
        });
      });
    }
    return result;
  }, [filteredMessages, getDateLabel]);

  const lastMessageIndex = useMemo(() => 
    messagesWithSeparators
      .map((item, idx) => ({ ...item, originalIndex: idx }))
      .filter(item => item.type === "message")
      .pop()?.originalIndex,
    [messagesWithSeparators]
  );

  const scrollToBottom = useCallback((behavior = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: behavior });
    }
  }, []);

  const isSelectedUserTyping = selectedUser && typingUsers[selectedUser._id];

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
          <div className="p-4 border-b border-slate-200 bg-purple- shadow-sm dark:from-slate-800 dark:to-slate-900">
            <User userDetails={selectedUser} showUnreadCount={false} isTyping={isSelectedUserTyping} displayType="header" />
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-slate-900">
            {isLoadingMessages && currentPage === 1 ? (
              <div className="flex justify-center items-center h-full">
                <span className="loading loading-spinner loading-lg text-indigo-500"></span>
              </div>
            ) : messages?.length === 0 ? (
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
                {isLoadingMessages && currentPage > 1 && (
                  <div className="flex justify-center bg-slate-100 dark:bg-slate-700 rounded-lg">
                    <div className="custom-spinner"></div>
                  </div>
                )}
                {messagesWithSeparators.map((item, index) => {
                  if (item.type === "date-separator") {
                    return <DateSeparator key={item.id} label={item.label} />;
                  } else if (item.type === "message") {
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
          <SendMessage
            replyMessage={replyMessage}
            onCancelReply={() => setReplyMessage(null)}
            scrollToBottom={scrollToBottom}
          />
        </>
      ) : (
        <div className="h-full flex items-center justify-center flex-col gap-5 bg-gradient-to-br from-indigo-50 to-white p-8">
          <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
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
