import React, { useEffect, useRef } from 'react';
import { useSelector } from "react-redux";

const Message = ({ messageDetails }) => {
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

  // Add reply UI: click to reply
  const handleReply = () => {
    if (window.setReplyToMessage) {
      window.setReplyToMessage(messageDetails);
    }
  };

  return (
    <div
      ref={messageRef}
      className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'} mb-4`}
      onDoubleClick={handleReply}
      style={{ cursor: 'pointer' }}
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
        {/* Show quoted message if this is a reply */}
        {messageDetails.replyToMessage && (
          <div className="bg-indigo-50 border-l-4 border-indigo-400 px-3 py-1 mb-1 text-xs text-slate-700 rounded">
            Replying to: {messageDetails.replyToMessage.message}
          </div>
        )}
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