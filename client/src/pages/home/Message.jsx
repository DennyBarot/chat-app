import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useSelector } from "react-redux";
import PropTypes from 'prop-types';
import { getRelativeTime, isMessageRead, getReadTime } from '../../utils/timeUtils';

const formatTime = (timestamp) => {
  if (!timestamp) return "Invalid time";
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const Message = ({ messageDetails, onReply, isLastMessage }) => {
  const [showMenu, setShowMenu] = useState(false);
  const messageRef = useRef(null);
  const { userProfile, selectedUser } = useSelector(
    (state) => state.userReducer || { userProfile: null, selectedUser: null }
  );

  // Remove the automatic scrollIntoView to prevent unwanted animations
  // The scroll positioning is handled by the parent MessageContainer

  const createdAt = messageDetails?.createdAt;
  const isSentByMe = userProfile?._id === messageDetails?.senderId;

  const handleMouseEnter = useCallback(() => setShowMenu(true), []);
  const handleMouseLeave = useCallback(() => setShowMenu(false), []);
  const handleReply = useCallback(() => onReply(messageDetails), [onReply, messageDetails]);

  // Determine if message is read by receiver
  const messageRead = useMemo(() => isMessageRead(messageDetails, userProfile?._id), [messageDetails, userProfile]);
  const readTime = useMemo(() => getReadTime(messageDetails, userProfile?._id), [messageDetails, userProfile]);

  return (
    <div
      ref={messageRef}
      className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'} mb-4`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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
            className="absolute -top-6 right-4 bg-primary text-primary-foreground rounded-full p-2 shadow-lg hover:bg-primary/90 z-20 flex items-center justify-center transition duration-150"
            onClick={handleReply}
            title="Reply to this message"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h7V6a1 1 0 011.707-.707l7 7a1 1 0 010 1.414l-7 7A1 1 0 0110 18v-4H3v-4z" />
            </svg>
          </button>
        )}
        {/* Quoted message block */}
        {messageDetails.quotedMessage && (
          <div className="bg-primary/10 border-l-4 border-primary mb-2 px-3 py-2 text-sm rounded-md shadow-sm flex flex-col">
            <span className="font-semibold text-primary">
              {messageDetails.quotedMessage.senderName || 'Unknown'}:
            </span>
            <span className="text-text-primary">
              {messageDetails.quotedMessage.content || '[No content]'}
            </span>
            {messageDetails.quotedMessage.replyTo && (
              <span className="italic text-xs ml-2 text-primary"></span>
            )}
          </div>
        )}
        {/* Main message */}
        <div
          className={`px-4 py-2 rounded-2xl ${
            isSentByMe
              ? 'bg-primary text-primary-foreground rounded-tr-none'
              : 'bg-background border border-foreground text-text-primary rounded-tl-none shadow-sm'
          }`}
          style={{ position: 'relative' }}
        >
          {messageDetails.isAudioMessage ? (
            <div className="flex items-center bg-gray-800 p-2 rounded-lg">
              <button onClick={() => new Audio(messageDetails.audioData).play()} className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.586-2.143A1 1 0 009 10.5v3a1 1 0 001.166.832l3.586-2.143a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <div className="flex-1 mx-2">
                <div className="h-2 bg-gray-600 rounded-full">
                  <div className="h-full bg-primary" style={{ width: `${(messageDetails.audioDuration / 60) * 100}%` }}></div>
                </div>
              </div>
              <span className="text-white">{messageDetails.audioDuration}s</span>
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words min-w-[80px]">
              {messageDetails?.content || '[No content]'}
            </p>
          )}
        </div>
        <div className={`text-xs mt-1 ${isSentByMe ? 'text-right mr-1' : 'ml-1'} text-text-secondary`}>
          {formatTime(createdAt)}
        </div>
        {isSentByMe && messageRead && isLastMessage && (
          <div className="text-xs mt-1 text-right mr-1 text-green-500 font-semibold">
            {getRelativeTime(readTime)}
          </div>
        )}
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

export default React.memo(Message);

