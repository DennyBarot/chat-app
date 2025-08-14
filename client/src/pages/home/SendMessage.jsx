import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { sendMessageThunk } from "../../store/slice/message/message.thunk";
import { IoIosSend } from "react-icons/io";
import { useSocket } from "../../context/SocketContext"; // <-- Add this

const SendMessage = ({ replyMessage, onCancelReply }) => {
  const dispatch = useDispatch();
  const { selectedUser } = useSelector((state) => state.userReducer);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const socket = useSocket(); // <-- Get socket instance

  // Clear input/reply when selected user changes (switching conversations)
  useEffect(() => {
    setMessage("");
    if (replyMessage) onCancelReply();
  }, [selectedUser?._id]);

  // Typing indicator debounce logic
  const [isCurrentlyTyping, setIsCurrentlyTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);

  // Get conversationId for this chat
  const { conversations } = useSelector((state) => state.messageReducer || { conversations: [] });
  const selectedConversationId = useMemo(() => {
    if (!selectedUser || !conversations) return null;
    return conversations.find(conv => conv.participants.some(p => p._id === selectedUser._id))?._id;
  }, [selectedUser, conversations]);

  // Emit typing event when user is typing something (debounced)
  useEffect(() => {
    if (!selectedConversationId || !socket || !message.trim()) {
      // Clear typing status
      if (isCurrentlyTyping) {
        socket.emit('typing', { conversationId: selectedConversationId, userId: selectedUser._id, isTyping: false });
        setIsCurrentlyTyping(false);
      }
      return;
    }

    // Always emit typing=true when user is typing something (debounced)
    setIsCurrentlyTyping(true);
    socket.emit('typing', { conversationId: selectedConversationId, userId: selectedUser._id, isTyping: true });

    // Schedule a "stop typing" event 1.5 seconds after last keystroke
    clearTimeout(typingTimeout);
    const timeout = setTimeout(() => {
      socket.emit('typing', { conversationId: selectedConversationId, userId: selectedUser._id, isTyping: false });
      setIsCurrentlyTyping(false);
    }, 1500);
    setTypingTimeout(timeout);

    return () => {};
  }, [message, socket, selectedConversationId, selectedUser?._id]);

  const handleChange = useCallback(
    (e) => {
      setMessage(e.target.value);
      // No need to re-emit here; useEffect above handles it
    },
    []
  );

  // Main send logic (handles Enter key and button click)
  const handleSendMessage = useCallback(
    async (e) => {
      // Prevent accidental double submit if clicked/pressed multiple times
      if (e && e.type === "keydown" && e.key !== "Enter") return;
      if (!message.trim()) return;

      setIsSubmitting(true);
      try {
        await dispatch(
          sendMessageThunk({
            recieverId: selectedUser?._id,
            message,
            timestamp: new Date().toISOString(),
            replyTo: replyMessage?._id,
          })
        );
        setMessage("");
        if (replyMessage) onCancelReply();
      } catch (error) {
        // Error toast/feedback is handled within your thunk
      }
      setIsSubmitting(false);

      // Clear typing status after sending
      if (socket && selectedConversationId && selectedUser?._id) {
        socket.emit('typing', { conversationId: selectedConversationId, userId: selectedUser._id, isTyping: false });
        setIsCurrentlyTyping(false);
        clearTimeout(typingTimeout);
      }
    },
    [dispatch, message, selectedUser?._id, replyMessage, onCancelReply, socket, selectedConversationId, typingTimeout]
  );

  // Button loading vs. send icon
  const SendButtonContent = useMemo(
    () =>
      isSubmitting ? (
        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
        <IoIosSend className="text-xl" />
      ),
    [isSubmitting]
  );

  // Button state
  const isButtonDisabled = !message.trim() || isSubmitting;
  const buttonClass = isButtonDisabled
    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
    : "bg-indigo-600 text-white hover:bg-indigo-700";

  return (
    <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
      {/* Reply preview bar */}
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
      {/* Input and send button */}
      <div className="flex gap-3 items-center">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Type your message..."
            className="w-full pl-4 pr-12 py-3 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            value={message}
            onChange={handleChange}
            onKeyDown={handleSendMessage}
            disabled={isSubmitting}
          />
        </div>
        <button
          onClick={handleSendMessage}
          disabled={isButtonDisabled}
          className={`p-3 rounded-full ${buttonClass} transition-colors flex items-center justify-center`}
        >
          {SendButtonContent}
        </button>
      </div>
    </div>
  );
};

export default SendMessage;
