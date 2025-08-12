import React, { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { IoIosSend } from "react-icons/io";
import { useDispatch, useSelector } from "react-redux";
import { sendMessageThunk, addMessage } from "../../store/slice/message/message.thunk";
import { toast } from "react-hot-toast";

const SendMessage = ({ replyMessage, onCancelReply }) => {
  const dispatch = useDispatch();
  const { selectedUser } = useSelector((state) => state.userReducer);
  const { userProfile } = useSelector((state) => state.userReducer);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef(null);

  // Focus input after reply/cancel
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [replyMessage]);

  // Handle message send (optimistic UI)
  const handleSendMessage = async () => {
    if (!message.trim() || !selectedUser?._id || !userProfile?._id) return;
    if (isSubmitting) return;

    const tempId = Date.now().toString();
    const optimisticMessage = {
      _id: tempId,
      senderId: userProfile._id,
      receiverId: selectedUser._id,
      content: message,
      createdAt: new Date().toISOString(),
      replyTo: replyMessage?._id,
      readBy: [userProfile._id],
    };

    // Optimistically add to local state (optional, if your UI supports it)
    // dispatch(addMessage(optimisticMessage));

    setIsSubmitting(true);
    setMessage("");

    try {
      await dispatch(
        sendMessageThunk({
          receiverId: selectedUser._id,
          message,
          replyTo: replyMessage?._id,
        })
      );
      if (replyMessage) onCancelReply();
      // In a real app, socket.io would emit and the backend would confirm/replace the temp message
    } catch (error) {
      toast.error("Failed to send message. Try again.");
      console.error("Send error:", error);
    } finally {
      setIsSubmitting(false);
      if (inputRef.current) inputRef.current.focus();
    }
  };

  // Handle Enter key (but not Shift+Enter)
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !isSubmitting) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
      {/* Reply preview */}
      {replyMessage && (
        <div
          className="bg-indigo-50 dark:bg-indigo-900 border-l-4 border-indigo-400 mb-2 px-3 py-2 text-sm rounded-md shadow flex items-center justify-between"
          role="status"
          aria-live="polite"
        >
          <div>
            <span className="font-semibold text-indigo-700 dark:text-indigo-300">
              Replying to:
            </span>
            <span className="text-indigo-900 dark:text-indigo-100 ml-1">
              {replyMessage.content}
            </span>
          </div>
          <button
            onClick={onCancelReply}
            className="ml-4 px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-500 rounded hover:bg-indigo-100 dark:hover:bg-indigo-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            aria-label="Cancel reply"
          >
            Cancel
          </button>
        </div>
      )}
      {/* Message input */}
      <div className="flex gap-3 items-center">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            placeholder="Type your message..."
            className="w-full pl-4 pr-12 py-3 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
            aria-label="Message input"
            aria-disabled={isSubmitting}
          />
        </div>
        {/* Send button */}
        <button
          onClick={handleSendMessage}
          disabled={!message.trim() || isSubmitting}
          className={`p-3 rounded-full ${
            message.trim() && !isSubmitting
              ? "bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              : "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
          } transition-colors flex items-center justify-center`}
          aria-label="Send message"
          aria-disabled={!message.trim() || isSubmitting}
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <IoIosSend className="text-xl" />
          )}
        </button>
      </div>
    </div>
  );
};

SendMessage.propTypes = {
  replyMessage: PropTypes.shape({
    _id: PropTypes.string,
    content: PropTypes.string,
    replyTo: PropTypes.string,
  }),
  onCancelReply: PropTypes.func.isRequired,
};

export default SendMessage;
