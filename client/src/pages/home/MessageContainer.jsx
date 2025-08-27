import React, { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from "react";
import User from "./User";
import Message from "./Message";
import DateSeparator from "./DateSeparator";
import { SkeletonMessageList } from "../../components/SkeletonMessage";
import { getMessageThunk, markMessagesReadThunk, clearMessageCache } from "../../store/slice/message/message.thunk";
import { messagesRead, setNewMessage, clearMessages } from "../../store/slice/message/message.slice";
import { useSocket } from "../../context/SocketContext";
import SendMessage from "./SendMessage";
import { useLocation } from "react-router-dom";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { setTyping } from "../../store/slice/typing/typing.slice";

const MessageContainer = ({ onBack, isMobile }) => {
  const dispatch = useDispatch();
  const { userProfile, selectedUser } = useSelector((state) => state.userReducer || { userProfile: null, selectedUser: null });
  const messages = useSelector((state) => state.messageReducer.messages);
    const conversations = useSelector((state) => state.messageReducer.conversations);
  const typingUsers = useSelector((state) => state.typingReducer.typingUsers);
   // 1. Get the clean socket connection from the context.
   const socket = useSocket();
     // Derive the current conversation ID from the Redux state.
  // Derive the current conversation ID from the Redux state.
  const selectedConversationId = useMemo(() => {
    if (!selectedUser || !conversations) return null;
    const conversation = conversations.find(conv => 
      conv.participants.some(p => p._id === selectedUser._id)
    );
    return conversation?._id;
  }, [selectedUser, conversations]);
  

  // Local component state
  const [replyMessage, setReplyMessage] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showNewMessageIndicator, setShowNewMessageIndicator] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0); // Track the number of new messages

  // Refs for managing scroll behavior
  const scrollRef = useRef(null);
  const messagesEndRef = useRef(null);
  const prevScrollHeightRef = useRef(0);
  const isInitialLoadRef = useRef(true);
 
    // 2. This effect is the single source of truth for all real-time events related to the open chat.
  useEffect(() => {
    // The socket can be null initially, and we only listen if a conversation is open.
    if (!socket || !selectedConversationId) return;

    const handleNewMessage = (newMessage) => {
      if (newMessage.conversationId === selectedConversationId) {
        dispatch(setNewMessage(newMessage));
        setNewMessageCount(prevCount => prevCount + 1); // Increment new message count
        // Since the user is actively watching, we immediately mark the message as read.
        dispatch(markMessagesReadThunk({ conversationId: selectedConversationId }));
      }
    };

    const handleMessagesRead = (data) => {
      // This handles the "read receipt" update when the other user reads your messages.
      dispatch(messagesRead(data));
    };

    // Set up the listeners.
    socket.on("newMessage", handleNewMessage);
    socket.on("messagesRead", handleMessagesRead);

    // Cleanup function to remove listeners.
    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("messagesRead", handleMessagesRead);
    };
  }, [socket, selectedConversationId, dispatch]);

 // Effect to fetch initial messages when a user is selected.
  useEffect(() => {
    isInitialLoadRef.current = true;
    if (selectedUser?._id) {
      setIsLoadingMessages(true);
      dispatch(clearMessages());
      dispatch(getMessageThunk({ otherParticipantId: selectedUser._id, page: 1, limit: 20 }))
        .unwrap()
        .then((payload) => {
          setHasMoreMessages(payload.hasMore);
          setCurrentPage(1);
        })
        .catch(console.error)
        .finally(() => setIsLoadingMessages(false));
    }
  }, [selectedUser?._id, dispatch]);

  // Effect for infinite scroll (loading older messages)
  useEffect(() => {
    const currentScrollRef = scrollRef.current;
    if (!currentScrollRef) return;

    const handleScroll = async () => {
      if (currentScrollRef.scrollTop === 0 && hasMoreMessages && !isLoadingMessages && !isLoadingMore) {
        setIsLoadingMore(true);
        const nextPage = currentPage + 1;
        
        // Capture the current scroll height BEFORE loading new messages
        // This is crucial for maintaining the correct scroll position
        prevScrollHeightRef.current = currentScrollRef.scrollHeight;
        
        try {
          const action = await dispatch(getMessageThunk({ otherParticipantId: selectedUser._id, page: nextPage, limit: 20 }));
          if (getMessageThunk.fulfilled.match(action) && action.payload) {
            setHasMoreMessages(action.payload.hasMore);
            setCurrentPage(nextPage);
          }
        } catch (error) {
          console.error("Failed to fetch more messages:", error);
        } finally {
          setIsLoadingMore(false);
        }
      }
    };

    currentScrollRef.addEventListener('scroll', handleScroll, { passive: false });
    return () => {
      if (currentScrollRef) {
        currentScrollRef.removeEventListener('scroll', handleScroll);
      }
    };
  }, [currentPage, hasMoreMessages, isLoadingMessages, isLoadingMore, selectedUser?._id, dispatch]);

  // Adjust scroll position after prepending older messages
  useLayoutEffect(() => {
    const currentScrollRef = scrollRef.current;
    if (currentScrollRef && !isLoadingMessages && currentPage > 1) {
      const newScrollHeight = currentScrollRef.scrollHeight;
      const oldScrollHeight = prevScrollHeightRef.current;

      if (oldScrollHeight > 0) {
        // Calculate the exact scroll position adjustment
        const heightDifference = newScrollHeight - oldScrollHeight;
        
        // Set the scroll position to maintain the user's view of the same messages
        // This ensures the scroll position moves down by the exact height of the new messages
        currentScrollRef.scrollTop = heightDifference;
        
        // Reset the reference for next load
        prevScrollHeightRef.current = 0;
      }
    }
  }, [messages, isLoadingMessages, currentPage]);

  // Handle initial scroll to bottom on first load
  useLayoutEffect(() => {
    if (isInitialLoadRef.current && messages && messages.length > 0) {
      // Ensure scroll happens after messages are rendered
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        isInitialLoadRef.current = false;
      }, 0); // A small delay to allow DOM to update
    }
  }, [messages]);

  // Use the Redux 'messages' state for all derivations
  const lastMessage = useMemo(() => (messages ? messages[messages.length - 1] : null), [messages]);
  
   // Conditional auto-scrolling effect
  useLayoutEffect(() => {
    if (isInitialLoadRef.current) return;
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const isScrolledToBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 200;
    if (isScrolledToBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setShowNewMessageIndicator(false);
    } else {
      setShowNewMessageIndicator(true);
    }
  }, [lastMessage]);

   // Hide indicator if user scrolls down manually
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const handleManualScroll = () => {
      if (scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 200) {
        setShowNewMessageIndicator(false);
      }
    };
    scrollContainer.addEventListener('scroll', handleManualScroll, { passive: false });
    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleManualScroll);
      }
    };
  }, []);


  const getDateLabel = useCallback((dateString) => {
    const date = parseISO(dateString);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "dd MMM yyyy");
  }, []);

  const messagesWithSeparators = useMemo(() => {
    const safeMessages = Array.isArray(messages) ? messages : [];
    const sortedMessages = [...safeMessages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const result = [];
    let lastDate = null;

    sortedMessages.forEach((message) => {
      const messageDate = message.createdAt;
      if (messageDate) {
        const currentDate = messageDate.split("T")[0];
        if (lastDate !== currentDate) {
          result.push({ type: "date-separator", id: `separator-${currentDate}`, label: getDateLabel(messageDate) });
          lastDate = currentDate;
        }
      }
      result.push({ type: "message", id: message._id, messageDetails: message });
    });
    return result;
  }, [messages, getDateLabel]);

  const lastMessageIndex = useMemo(() =>
    messagesWithSeparators.map((item, idx) => ({ ...item, originalIndex: idx })).filter(item => item.type === "message").pop()?.originalIndex,
    [messagesWithSeparators]
  );

  const handleReply = useCallback((message) => setReplyMessage(message), []);
   const isSelectedUserTyping = selectedUser && typingUsers[selectedUser._id];




  return (
    <div className="flex-1 flex flex-col h-full bg-background text-text-primary relative">
      {isMobile && (
        <button onClick={onBack} aria-label="Back" title="Back" className="absolute top-2 left-2 z-20 p-1 rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      {selectedUser ? (
        <>
          <div className="p-4 border-b border-foreground shadow-sm">
            <User userDetails={selectedUser} showUnreadCount={false} isTyping={isSelectedUserTyping} displayType="header" />
          </div>
          {/* 3. Add 'relative' class for positioning the indicator button */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-background to-foreground relative">
            {isLoadingMessages && currentPage === 1 ? (
              <div className="space-y-4">
                <SkeletonMessageList count={8} />
              </div>
            ) : messages?.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-text-secondary">
                <p>Send a message to start the conversation with {selectedUser.fullName}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {isLoadingMore && (
                  <div className="flex justify-center items-center py-2">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-2 text-sm text-text-secondary">Loading more messages...</span>
                  </div>
                )}
                {messagesWithSeparators.map((item, index) => {
                  if (item.type === "date-separator") return <DateSeparator key={item.id} label={item.label} />;
                  return <Message key={item.id} messageDetails={item.messageDetails} onReply={handleReply} isLastMessage={index === lastMessageIndex} />;
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
            
            {showNewMessageIndicator && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
                <button onClick={() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); setShowNewMessageIndicator(false); }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all flex items-center gap-2 animate-bounce">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  {newMessageCount > 1 ? `${newMessageCount} New Messages` : 'New Message'}
                </button>
              </div>
            )}
          </div>
          <SendMessage replyMessage={replyMessage} onCancelReply={() => setReplyMessage(null)} />
        </>
      ) : (
        <div className="h-full flex items-center justify-center text-text-secondary">
          <p>Select a user to start chatting.</p>
        </div>
      )}
    </div>
  );
};

export default MessageContainer;
