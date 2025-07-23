import React, { useEffect, useRef } from 'react';
import { useSelector } from "react-redux";

const Message = ({ messageDetails, onReply }) => {
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
      
      <div className={`max-w-[70%]`}>
        {/* Quoted message block */}
        {messageDetails.quotedMessage && (
          <div className="bg-gray-100 border-l-4 border-gray-400 mb-1 px-2 py-1 text-sm">
            <span className="font-semibold">{messageDetails.quotedMessage.senderName}:</span>
            <span> {messageDetails.quotedMessage.content}</span>
            {messageDetails.quotedMessage.replyTo && <span className="italic text-xs ml-2">(Nested reply)</span>}
          </div>
        )}
        {/* Main message */}
        <div 
          className={`px-4 py-2 rounded-2xl ${
            isSentByMe 
              ? 'bg-indigo-600 text-white rounded-tr-none' 
              : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
          }`}
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