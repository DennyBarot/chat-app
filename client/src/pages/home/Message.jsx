import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import { getRelativeTime, isMessageRead, getReadTime } from "../../utils/timeUtils";

const getAvatar = (avatar, name) =>
  avatar ||
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "U")}&background=random`;

const MessageComponent = ({ messageDetails, onReply, isLastInBlock = false }) => {
  const [showMenu, setShowMenu] = useState(false);
  const messageRef = useRef(null);
  const { userProfile, selectedUser } = useSelector(
    (state) => state.userReducer || { userProfile: null, selectedUser: null }
  );

  useEffect(() => {
    if (messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const createdAt = messageDetails?.createdAt;
  const isSentByMe = userProfile?._id === messageDetails?.senderId;
  const messageRead = isMessageRead(messageDetails, userProfile?._id);
  const readTime = getReadTime(messageDetails, userProfile?._id);

  const quotedContent = messageDetails.quotedMessage?.content || "[No content]";
  const quotedSender = messageDetails.quotedMessage?.senderName || "Unknown";

  return (
    <div
      ref={messageRef}
      className={`flex ${isSentByMe ? "justify-end" : "justify-start"} mb-4`}
      onMouseEnter={() => setShowMenu(true)}
      onMouseLeave={() => setShowMenu(false)}
      style={{ position: "relative" }}
      role="listitem"
    >
      {!isSentByMe && (
        <div className="flex-shrink-0 mr-3">
          <div className="w-8 h-8 rounded-full overflow-hidden">
            <img
              src={getAvatar(selectedUser?.avatar, selectedUser?.fullName)}
              alt={selectedUser?.fullName || "User"}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = getAvatar(null, selectedUser?.fullName);
              }}
            />
          </div>
        </div>
      )}
      <div className="max-w-[70%] relative min-w-[120px]">
        {/* Reply button */}
        {showMenu && (
          <button
            className="absolute -top-8 right-2 bg-indigo-600 text-white rounded-full p-2 shadow-lg hover:bg-indigo-700 z-20 flex items-center justify-center transition duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            onClick={() => onReply(messageDetails)}
            onKeyDown={(e) => e.key === "Enter" && onReply(messageDetails)}
            aria-label="Reply to message"
            tabIndex="0"
            title="Reply to this message"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 10h7V6a1 1 0 011.707-.707l7 7a1 1 0 010 1.414l-7 7A1 1 0 0110 18v-4H3v-4z"
              />
            </svg>
          </button>
        )}
        {/* Quoted message */}
        {messageDetails.quotedMessage && (
          <div className="bg-indigo-50 border-l-4 border-indigo-400 mb-2 px-3 py-2 text-sm rounded-md shadow-sm flex flex-col">
            <span className="font-semibold text-indigo-700">{quotedSender}:</span>
            <span className="text-indigo-900">{quotedContent}</span>
            {messageDetails.quotedMessage.replyTo && (
              <span className="italic text-xs ml-2 text-indigo-500"></span>
            )}
          </div>
        )}
        {/* Main message */}
        <div
          className={`px-4 py-2 rounded-2xl ${
            isSentByMe
              ? "bg-indigo-600 text-white rounded-tr-none"
              : "bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm"
          }`}
          style={{ position: "relative" }}
        >
          <p className="whitespace-pre-wrap break-words">{messageDetails?.content || "[No content]"}</p>
        </div>
        <div className={`text-xs mt-1 ${isSentByMe ? "text-right mr-1" : "ml-1"} text-slate-500`}>
          {createdAt ? new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Invalid time"}
        </div>
        {isSentByMe && messageRead && isLastInBlock && (
          <div className="text-xs mt-1 text-right mr-1 text-green-600 font-semibold">
            {getRelativeTime(readTime)}
          </div>
        )}
      </div>
      {isSentByMe && (
        <div className="flex-shrink-0 ml-3">
          <div className="w-8 h-8 rounded-full overflow-hidden">
            <img
              src={getAvatar(userProfile?.avatar, userProfile?.fullName)}
              alt={userProfile?.fullName || "You"}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = getAvatar(null, userProfile?.fullName);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

MessageComponent.propTypes = {
  messageDetails: PropTypes.shape({
    createdAt: PropTypes.string,
    senderId: PropTypes.string,
    content: PropTypes.string,
    quotedMessage: PropTypes.shape({
      senderName: PropTypes.string,
      content: PropTypes.string,
      replyTo: PropTypes.string,
    }),
  }).isRequired,
  onReply: PropTypes.func.isRequired,
  isLastInBlock: PropTypes.bool,
};

const Message = React.memo(MessageComponent);

export default Message;
