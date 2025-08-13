import React, { useEffect, useRef, useState, memo, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { getRelativeTime, isMessageRead, getReadTime } from "../../utils/timeUtils.js";
import { axiosInstance } from "../../components/utilities/axiosInstance.js";

const Message = ({ messageDetails, onReply, isLastMessage }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
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
  const otherUserAvatar = selectedUser?.avatar;
  const otherUserName = selectedUser?.fullName;
  const myAvatar = userProfile?.avatar;
  const myName = userProfile?.fullName;

  // Format time
  const formatTime = useCallback((timestamp) => {
    if (!timestamp) return "Invalid time";
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, []);

  // Read status for "sent by me" messages
  const messageRead = useMemo(
    () => isMessageRead(messageDetails, userProfile?._id),
    [messageDetails, userProfile?._id]
  );
  const readTime = useMemo(
    () => getReadTime(messageDetails, userProfile?._id),
    [messageDetails, userProfile?._id]
  );
  const formattedTime = useMemo(() => formatTime(createdAt), [createdAt, formatTime]);
  const relativeTime = useMemo(() => getRelativeTime(readTime), [readTime]);

  const handleReply = useCallback(
    () => onReply(messageDetails),
    [onReply, messageDetails]
  );

  // Handle emoji reaction
  const handleReaction = useCallback(
    async (emoji) => {
      try {
        const res = await axiosInstance.post(
          `/api/v1/message/${messageDetails._id}/react`,
          { emoji }
        );
        // Reactions will be updated via socket.io in real time, so no need to update local state here
        setShowReactionPicker(false);
      } catch (err) {
        console.error("Failed to react:", err);
      }
    },
    [messageDetails._id]
  );

  // Utility function to safely get reaction user IDs
  const getReactionUserIds = useCallback((emoji) => {
    if (!messageDetails?.reactions) return [];
    
    // Handle both Map and plain object formats
    if (messageDetails.reactions instanceof Map) {
      return [...(messageDetails.reactions.get(emoji) || [])];
    } else if (typeof messageDetails.reactions === 'object') {
      return [...(messageDetails.reactions[emoji] || [])];
    }
    
    return [];
  }, [messageDetails?.reactions]);

  // Get unique user IDs who reacted (for tooltip)
  const getReactionUsers = useCallback((emoji) => {
    const userIds = getReactionUserIds(emoji);
    if (!userIds.length) return null;
    
    return userIds
      .map((id) => (id === userProfile?._id ? "You" : selectedUser.fullName))
      .join(", ");
  }, [getReactionUserIds, selectedUser.fullName, userProfile?._id]);

  return (
    <div
      ref={messageRef}
      className={`flex ${isSentByMe ? "justify-end" : "justify-start"} mb-4`}
      onMouseEnter={() => setShowMenu(true)}
      onMouseLeave={() => {
        setShowMenu(false);
        setShowReactionPicker(false);
      }}
      role="listitem"
      aria-label={isSentByMe ? "Your message" : `${otherUserName}'s message`}
      style={{ position: "relative" }}
    >
      {/* Other user's avatar (when message is received) */}
      {!isSentByMe && (
        <div className="flex-shrink-0 mr-3">
          <div className="w-8 h-8 rounded-full overflow-hidden">
            <img
              src={otherUserAvatar}
              alt={otherUserName}
              className="w-full h-full object-cover"
              aria-hidden="true"
            />
          </div>
        </div>
      )}
      <div className="max-w-[70%] relative">
        {/* Reply button above message bubble (inline SVG) */}
        {showMenu && (
          <>
            <button
              className="absolute -top-6 right-4 bg-indigo-600 text-white rounded-full p-2 shadow-lg hover:bg-indigo-700 z-20 flex items-center justify-center transition duration-150"
              onClick={handleReply}
              title="Reply to this message"
              aria-label="Reply"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h7V6a1 1 0 011.707-.707l7 7a1 1 0 010 1.414l-7 7A1 1 0 0110 18v-4H3v-4z" />
              </svg>
            </button>
            {/* Reaction picker */}
            <button
              className="absolute -top-6 right-14 bg-indigo-600 text-white rounded-full p-2 shadow-lg hover:bg-indigo-700 z-20 flex items-center justify-center transition duration-150"
              onClick={() => setShowReactionPicker(!showReactionPicker)}
              title="React to this message"
              aria-label="React"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            {showReactionPicker && (
              <div className="absolute -top-6 -right-48 z-20 bg-white dark:bg-slate-700 rounded-full p-1 shadow-lg flex gap-1">
                {["👍", "❤️", "😂", "😮", "🙏"].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className="p-1 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-800 transition-colors"
                    title={getReactionUsers(emoji) ? `${emoji} (${getReactionUsers(emoji)})` : emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Quoted message block */}
        {messageDetails.quotedMessage && (
          <div className="bg-indigo-50 border-l-4 border-indigo-400 mb-2 px-3 py-2 text-sm rounded-md shadow-sm flex flex-col">
            <span className="font-semibold text-indigo-700">
              {messageDetails.quotedMessage.senderName || "Unknown"}:
            </span>
            <span className="text-indigo-900">{messageDetails.quotedMessage.content || "[No content]"}</span>
            {messageDetails.quotedMessage.replyTo && (
              <span className="italic text-xs ml-2 text-indigo-500"></span>
            )}
          </div>
        )}

        {/* Main message bubble */}
        <div
          className={`px-4 py-2 rounded-2xl ${
            isSentByMe
              ? "bg-indigo-600 text-white rounded-tr-none"
              : "bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm"
          }`}
        >
          <p className="whitespace-pre-wrap break-words min-w-[80px]">
            {messageDetails?.content || "[No content]"}
          </p>
        </div>
        <div className={`text-xs mt-1 ${isSentByMe ? "text-right mr-1" : "ml-1"} text-slate-500`}>
          {formattedTime}
        </div>

        {/* Read status for sent messages, only on last message */}
        {isSentByMe && messageRead && isLastMessage && (
          <div className="text-xs mt-1 text-right mr-1 text-green-600 font-semibold">
            {relativeTime}
          </div>
        )}

        {/* Reactions */}
        {(() => {
          const reactions = messageDetails?.reactions;
          if (!reactions) return null;
          
          // Handle both Map and plain object formats
          const entries = reactions instanceof Map 
            ? [...reactions.entries()] 
            : Object.entries(reactions || {});
          
          return entries.length > 0 ? (
            <div className="flex items-center gap-1 mt-1">
              {entries.map(([emoji, userIds]) => (
                <span
                  key={emoji}
                  className="text-xs bg-slate-100 dark:bg-slate-700 rounded-full px-2 py-1 flex items-center gap-1"
                  title={getReactionUsers(emoji) ? `${emoji} (${getReactionUsers(emoji)})` : emoji}
                >
                  {emoji} {Array.isArray(userIds) ? userIds.length : 0}
                </span>
              ))}
            </div>
          ) : null;
        })()}
      </div>

      {/* My avatar (when message is sent by me) */}
      {isSentByMe && (
        <div className="flex-shrink-0 ml-3">
          <div className="w-8 h-8 rounded-full overflow-hidden">
            <img
              src={myAvatar}
              alt={myName}
              className="w-full h-full object-cover"
              aria-hidden="true"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Message;
