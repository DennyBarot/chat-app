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

const MessageContainer = ({ onBack, isMobile, callUser, userProfile, stream, isStreamReady }) => {
  const dispatch = useDispatch();
  const { selectedUser } = useSelector((state) => state.userReducer || { userProfile: null, selectedUser: null });
  const { conversations, messages: messagesByConversation } = useSelector((state) => state.messageReducer);
  const typingUsers = useSelector((state) => state.typingReducer.typingUsers);
  const { isStreamReady } = useSelector((state) => state.callReducer);
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
            <div className="flex gap-2">
              <button 
                onClick={() => callUser(selectedUser._id)}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Voice Call"
                disabled={!userProfile || !isStreamReady}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </button>
              <button 
                onClick={() => callUser(selectedUser._id)}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Video Call"
                disabled={!userProfile || !isStreamReady}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
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