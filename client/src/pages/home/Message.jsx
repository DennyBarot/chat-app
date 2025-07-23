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

  // Add reply UI: show reply icon and option
  const handleReply = () => {
    if (window.setReplyToMessage) {
      window.setReplyToMessage(messageDetails);
    }
  };

  return (
    <div
      ref={messageRef}
      className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'} mb-4 group`}
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
      <div className={`max-w-[70%] relative`}>
        {/* Show quoted message if this is a reply */}
        {messageDetails.replyTo && (
          <div className="quoted-reply">
            <span>
              Replying to: {messageDetails.replyTo.senderId === userProfile._id ? "You" : "Other"}
            </span>
            <div>{messageDetails.replyTo.message}</div>
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
        {/* Reply icon and option (visible on hover) */}
        <button
          className="absolute -top-6 right-0 bg-white border border-slate-200 rounded-full p-1 shadow-sm text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs"
          title={`Reply to ${isSentByMe ? 'You' : selectedUser?.fullName}`}
          onClick={handleReply}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h7V6a1 1 0 011.707-.707l7 7a1 1 0 010 1.414l-7 7A1 1 0 0110 18v-4H3v-4z" /></svg>
          Reply
        </button>
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