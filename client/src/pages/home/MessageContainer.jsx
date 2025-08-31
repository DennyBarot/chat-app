import React, { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from "react";
import User from "./User";
import Message from "./Message";
import DateSeparator from "./DateSeparator";
import { useDispatch, useSelector } from "react-redux";
import { getMessageThunk, markMessagesReadThunk } from "../../store/slice/message/message.thunk";
import { messagesRead, setNewMessage } from "../../store/slice/message/message.slice";
import { useSocket } from "../../context/SocketContext";
import SendMessage from "./SendMessage";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { setIdToCall, setName } from "../../store/slice/call/call.slice";

const MessageContainer = ({ onBack, isMobile }) => {
  const dispatch = useDispatch();
  const { userProfile, selectedUser, screenLoading } = useSelector((state) => state.userReducer || { userProfile: null, selectedUser: null, screenLoading: true });
  // Fix: userProfile might be null or undefined, so fallback to empty object to avoid undefined.name
  const safeUserProfile = userProfile || {};

  // Fix: userProfile.name might be undefined, try to get name from userProfile.fullName or userProfile.username as fallback
  const userName = safeUserProfile.name || safeUserProfile.fullName || safeUserProfile.username || "";

  // Debug: Check why button is disabled
  console.log('Call button debug:', {
    screenLoading,
    userProfile,
    safeUserProfile,
    userName,
    userProfileKeys: Object.keys(safeUserProfile),
    isDisabled: screenLoading || !userName
  });
  const { conversations, messages: messagesByConversation } = useSelector((state) => state.messageReducer);
  const typingUsers = useSelector((state) => state.typingReducer.typingUsers);
  const socket = useSocket();

  const selectedConversationId = useMemo(() => {
    if (!selectedUser || !conversations) return null;
    const conversation = conversations.find(conv => 
      conv.participants.some(p => p._id === selectedUser._id)
    );
    return conversation?._id;
  }, [selectedUser, conversations]);

  const messages = useMemo(() => messagesByConversation[selectedConversationId] || [], [messagesByConversation, selectedConversationId]);

  const [replyMessage, setReplyMessage] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showNewMessageIndicator, setShowNewMessageIndicator] = useState(false);

  const scrollRef = useRef(null);
  const messagesEndRef = useRef(null);
  const prevScrollHeightRef = useRef(0);
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    if (!socket || !selectedConversationId) return;

    const handleNewMessage = (newMessage) => {
      if (newMessage.conversationId === selectedConversationId) {
        dispatch(setNewMessage(newMessage));
        dispatch(markMessagesReadThunk({ conversationId: selectedConversationId }));
      }
    };

    const handleMessagesRead = (data) => {
      dispatch(messagesRead({ ...data, conversationId: selectedConversationId }));
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("messagesRead", handleMessagesRead);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("messagesRead", handleMessagesRead);
    };
  }, [socket, selectedConversationId, dispatch]);

  useEffect(() => {
    isInitialLoadRef.current = true;
    if (selectedUser?._id && selectedConversationId) {
      const cachedMessages = messagesByConversation[selectedConversationId];
      if (!cachedMessages || cachedMessages.length === 0) {
        setIsLoadingMessages(true);
        dispatch(getMessageThunk({ otherParticipantId: selectedUser._id, page: 1, limit: 20 }))
          .unwrap()
          .then((payload) => {
            setHasMoreMessages(payload.hasMore);
            setCurrentPage(1);
          })
          .catch(console.error)
          .finally(() => setIsLoadingMessages(false));
      } else {
        dispatch(getMessageThunk({ otherParticipantId: selectedUser._id, page: 1, limit: 20 }))
          .unwrap()
          .then((payload) => {
            setHasMoreMessages(payload.hasMore);
            setCurrentPage(1);
          });
      }
    }
  }, [selectedUser?._id, selectedConversationId, dispatch]);

  useEffect(() => {
    const currentScrollRef = scrollRef.current;
    if (!currentScrollRef) return;

    const handleScroll = async () => {
      if (currentScrollRef.scrollTop === 0 && hasMoreMessages && !isLoadingMessages && !isLoadingMore) {
        setIsLoadingMore(true);
        const nextPage = currentPage + 1;
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

  useLayoutEffect(() => {
    const currentScrollRef = scrollRef.current;
    if (currentScrollRef && !isLoadingMessages && currentPage > 1) {
      const newScrollHeight = currentScrollRef.scrollHeight;
      const oldScrollHeight = prevScrollHeightRef.current;

      if (oldScrollHeight > 0) {
        const heightDifference = newScrollHeight - oldScrollHeight;
        currentScrollRef.scrollTop = heightDifference;
        prevScrollHeightRef.current = 0;
      }
    }
  }, [messages, isLoadingMessages, currentPage]);

  useLayoutEffect(() => {
    if (isInitialLoadRef.current && messages && messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        isInitialLoadRef.current = false;
      }, 0);
    }
  }, [messages]);

  const lastMessage = useMemo(() => (messages ? messages[messages.length - 1] : null), [messages]);
  
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
    const sortedMessages = [...safeMessages];
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
          <div className="p-4 border-b border-foreground shadow-sm flex justify-between items-center">
            <User userDetails={selectedUser} showUnreadCount={false} isTyping={isSelectedUserTyping} displayType="header" />
            <button
              onClick={() => {
                console.log('Call button clicked', { selectedUser: selectedUser?._id, userProfile: userName });
                if (selectedUser?._id && userName) {
                  console.log('Dispatching call actions');
                  dispatch(setIdToCall(selectedUser._id));
                  dispatch(setName(userName));
                } else {
                  console.log('Missing required data for call');
                }
              }}
              disabled={screenLoading || !userName}
              className={`p-2 rounded-full transition-colors ${
                screenLoading || !userName
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
              title={screenLoading ? "Loading..." : "Start Call"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
            </button>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-background to-foreground relative">
            {isLoadingMessages && messages.length === 0 ? (
              <div className="flex justify-center items-center h-full">
                <span className="loading loading-spinner loading-lg text-primary"></span>
              </div>
            ) : messages?.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-text-secondary">
                <p>Send a message to start the conversation with {selectedUser.fullName}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {isLoadingMore && <div className="flex justify-center"><div className="custom-spinner"></div></div>}
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
                  New Message
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