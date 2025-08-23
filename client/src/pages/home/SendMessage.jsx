import React, { useState, useEffect, useRef, useCallback } from "react";
import { IoIosSend } from "react-icons/io";
import { useDispatch, useSelector } from "react-redux";
import { sendMessageThunk } from "../../store/slice/message/message.thunk";
import { axiosInstance } from "../../components/utilities/axiosInstance";
import { useSocket } from "../../context/SocketContext";

const SendMessage = ({ replyMessage, onCancelReply, scrollToBottom }) => {
  const dispatch = useDispatch();
  const { selectedUser, userProfile } = useSelector((state) => state.userReducer);
  const socket = useSocket();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  const handleSendMessage = useCallback(async () => {
    if (!message.trim()) return;

    // Optimistically clear the input field immediately
    const messageToSend = message;
    setMessage("");
    if (replyMessage) onCancelReply();
    
    // Only show loading for a very brief moment to indicate action was triggered
    setIsSubmitting(true);
    
    // Immediately set submitting to false since message appears via socket
    setTimeout(() => {
      setIsSubmitting(false);
    }, 100); // Very brief loading state
    
    try {
      // Send message in background without blocking UI
      await dispatch(sendMessageThunk({
        receiverId: selectedUser?._id,
        message: messageToSend,
        replyTo: replyMessage?._id,
      }));
      // Call scrollToBottom after successful dispatch
    
    } catch (error) {
      console.error("Error sending message:", error);
      // Optionally show a toast error here
      // In case of error, user can retype the message
    } finally {
      // Ensure typing indicator is off
      if (isTyping) {
        socket.emit("stopTyping", { senderId: userProfile._id, receiverId: selectedUser._id });
        setIsTyping(false);
        clearTimeout(typingTimeoutRef.current);
      }
    }
  }, [message, selectedUser, replyMessage, onCancelReply, isTyping, socket, userProfile, dispatch]);

  const handleInputChange = useCallback((e) => {
    setMessage(e.target.value);

    if (!socket || !userProfile || !selectedUser) return;

    // If message is not empty and user is not already marked as typing
    if (e.target.value.length > 0 && !isTyping) {
      setIsTyping(true);
      socket.emit("typing", { senderId: userProfile._id, receiverId: selectedUser._id });
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set a new timeout to emit stopTyping after a delay
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit("stopTyping", { senderId: userProfile._id, receiverId: selectedUser._id });
    }, 1000); // 1 second debounce

    // If message becomes empty, immediately send stopTyping
    if (e.target.value.length === 0 && isTyping) {
      setIsTyping(false);
      socket.emit("stopTyping", { senderId: userProfile._id, receiverId: selectedUser._id });
      clearTimeout(typingTimeoutRef.current);
    }
  }, [socket, userProfile, selectedUser, isTyping]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  useEffect(() => {
    // Cleanup timeout on component unmount
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 ">
      {replyMessage && (
        <div className="bg-indigo-50 border-l-4 border-indigo-400 mb-2 px-3 py-2 text-sm rounded-md shadow flex items-center justify-between">
          <div>
            <span className="font-semibold text-indigo-700">Replying to:</span>
            <span className="text-indigo-900 ml-1">{replyMessage.content}</span>
            {replyMessage.replyTo && (
              <span className="italic text-xs ml-2 text-indigo-500"></span>
            )}
          </div>
          <button
            onClick={onCancelReply}
            className="ml-4 px-2 py-1 text-xs bg-white border border-indigo-300 rounded hover:bg-indigo-100 transition"
          >
            Cancel
          </button>
        </div>
      )}
      <div className="flex gap-3 items-center">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Type your message..."
            className="w-full pl-4 pr-12 py-3 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
          />
        </div>

        <button
          onClick={handleSendMessage}
          disabled={!message.trim() || isSubmitting}
          className={`p-3 rounded-full ${
            message.trim() && !isSubmitting
              ? "bg-indigo-600 text-white hover:bg-indigo-700"
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
          } transition-colors flex items-center justify-center`}
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <IoIosSend className="text-xl" />
          )}
        </button>
      </div>
    </div>
  );
};

export default SendMessage;
