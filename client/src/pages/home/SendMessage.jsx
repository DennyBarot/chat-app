import React, { useState } from "react";
import { IoIosSend } from "react-icons/io";
import { useDispatch, useSelector } from "react-redux";
import { sendMessageThunk } from "../../store/slice/message/message.thunk";
import { axiosInstance } from "../../components/utilities/axiosInstance";

const SendMessage = ({ onSend, replyMessage, onCancelReply }) => {
  const dispatch = useDispatch();
  const { selectedUser } = useSelector((state) => state.userReducer);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    setIsSubmitting(true);
    const response = await axiosInstance.post(
      `/api/v1/message/send/${selectedUser?._id}`,
      {
        message,
        timestamp: new Date().toISOString(),
        replyTo: replyMessage?._id,
         conversationId: selectedUser.conversationId,
      }
    );
    setMessage("");
    setIsSubmitting(false);
    if (replyMessage) onCancelReply(); // Optionally clear reply after sending
  };

  const handleSend = () => {
    onSend(message, replyMessage?._id);
    setMessage("");
    onCancelReply();
  };

  return (
    <div className="p-4 bg-white border-t border-slate-200">
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

