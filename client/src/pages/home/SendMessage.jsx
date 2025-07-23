import React, { useState } from "react";
import { IoIosSend } from "react-icons/io";
import { useDispatch, useSelector } from "react-redux";
import { sendMessageThunk } from "../../store/slice/message/message.thunk";

const SendMessage = () => {
  const dispatch = useDispatch();
  const { selectedUser } = useSelector((state) => state.userReducer);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState(null);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    setIsSubmitting(true);
    await dispatch(
      sendMessageThunk({
        recieverId: selectedUser?._id,
        message,
        timestamp: new Date().toISOString(),
      })
    );
    setMessage("");
    setIsSubmitting(false);
  };

  return (
    <div className="p-4 bg-white border-t border-slate-200">
      {replyToMessage && (
        <div className="quoted-reply">
          <span>Replying to: {replyToMessage.message}</span>
          <button onClick={() => setReplyToMessage(null)}>Cancel</button>
        </div>
      )}
      <div className="flex gap-3 items-center">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Type your message..."
            className="w-full pl-4 pr-12 py-3 rounded-full border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
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