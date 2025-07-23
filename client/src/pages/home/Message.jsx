import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from "react-redux";

const Message = ({ messageDetails, onReply }) => {
  const [showMenu, setShowMenu] = useState(false);
  const messageRef = useRef(null);
  const { userProfile, selectedUser } = useSelector(
    (state) => state.userReducer
  );

  useEffect(() => {
    if (messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const createdAt = messageDetails?.createdAt;
  const isSentByMe = userProfile?._id === messageDetails?.senderId;

  // Format time
  const formatTime = (timestamp) => {
    if (!timestamp) return "Invalid time";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      ref={messageRef}
      className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'} mb-4`}
      onMouseEnter={() => setShowMenu(true)}
      onMouseLeave={() => setShowMenu(false)}
      style={{ position: 'relative' }}
    >
      {!isSentByMe && (
        <div className="flex-shrink-0 mr-3">
          <div className="w-8 h-8 rounded-full overflow-hidden">
            <img
              alt={selectedUser?.fullName}
              src={selectedUser?.avatar}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}
      <div className="max-w-[70%] relative">
        {/* Reply button above message bubble */}
        {showMenu && (
          <button
            className="absolute -top-6 right-4 bg-indigo-600 text-white rounded-full p-2 shadow-lg hover:bg-indigo-700 z-20 flex items-center justify-center transition duration-150"
            onClick={() => onReply(messageDetails)}
            title="Reply to this message"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h7V6a1 1 0 011.707-.707l7 7a1 1 0 010 1.414l-7 7A1 1 0 0110 18v-4H3v-4z" />
            </svg>
          </button>
        )}
        {/* Quoted message block */}
        {messageDetails.quotedMessage && (
          <div className="bg-indigo-50 border-l-4 border-indigo-400 mb-2 px-3 py-2 text-sm rounded-md shadow-sm flex flex-col">
            <span className="font-semibold text-indigo-700">{messageDetails.quotedMessage.senderName}:</span>
            <span className="text-indigo-900">{messageDetails.quotedMessage.content}</span>
            {messageDetails.quotedMessage.replyTo && <span className="italic text-xs ml-2 text-indigo-500">(Nested reply)</span>}
          </div>
        )}
        {/* Main message */}
        <div
          className={`px-4 py-2 rounded-2xl ${
            isSentByMe
              ? 'bg-indigo-600 text-white rounded-tr-none'
              : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
          }`}
          style={{ position: 'relative' }}
        >
          <p className="whitespace-pre-wrap break-words">{messageDetails?.message}</p>
        </div>
        <div className={`text-xs mt-1 ${isSentByMe ? 'text-right mr-1' : 'ml-1'} text-slate-500`}>
          {formatTime(createdAt)}
        </div>
      </div>
      {isSentByMe && (
        <div className="flex-shrink-0 ml-3">
          <div className="w-8 h-8 rounded-full overflow-hidden">
            <img
              alt={userProfile?.fullName}
              src={userProfile?.avatar}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Message;