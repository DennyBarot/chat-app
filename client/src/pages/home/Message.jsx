import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useSelector } from "react-redux";
import { formatTimeAgo, isMessageRead, getReadTime } from '../../utils/timeUtils'; // Corrected imports
import { FaReply } from 'react-icons/fa';
import { IoPlayCircle, IoPauseCircle } from 'react-icons/io5'; // Import play/pause icons

const formatTime = (timestamp) => {
  if (!timestamp) return "Invalid time";
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const Message = ({ message, onReply, isLastMessage }) => { // Changed prop name to 'message'
  // Defensive check: If message is null or undefined, don't render
  if (!message) {
    console.warn("Message component received null or undefined message prop.", message);
    return null;
  }

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const intervalRef = useRef(null);
  const [showMenu, setShowMenu] = useState(false);

  const messageRef = useRef(null);
  const { userProfile, selectedUser } = useSelector(
    (state) => state.userReducer || { userProfile: null, selectedUser: null }
  );

  const createdAt = message?.createdAt; // Changed to message
  const isSentByMe = userProfile?._id === message?.senderId; // Changed to message

  const handleMouseEnter = useCallback(() => setShowMenu(true), []);
  const handleMouseLeave = useCallback(() => setShowMenu(false), []);
  const handleReply = useCallback(() => onReply(message), [onReply, message]); // Changed to message

  const messageRead = useMemo(() => isMessageRead(message, userProfile?._id), [message, userProfile]); // Changed to message
  const readTime = useMemo(() => getReadTime(message, userProfile?._id), [message, userProfile]); // Changed to message

  const handlePlayAudio = () => {
    if (isPlaying) {
      // Pause if already playing
      audioRef.current?.pause();
      clearInterval(intervalRef.current);
      setIsPlaying(false);
      return;
    }

    // Create audio element if it doesn't exist or if source changes
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    // Set audio source based on whether it's a WebRTC audio or server-stored
    if (message.audioUrl) {
      audioRef.current.src = message.audioUrl;
    } else if (message.audioData) {
      audioRef.current.src = `data:audio/webm;base64,${message.audioData}`;
    }

    // Play audio
    audioRef.current.play();
    setIsPlaying(true);

    // Set up interval to update current time
    intervalRef.current = setInterval(() => {
      setCurrentTime((prevTime) => {
        // Use audioRef.current.duration for total duration
        if (audioRef.current && prevTime >= audioRef.current.duration) {
          clearInterval(intervalRef.current);
          setIsPlaying(false);
          return audioRef.current.duration;
        }
        return prevTime + 1;
      });
    }, 1000);

    // Handle audio end
    audioRef.current.onended = () => {
      clearInterval(intervalRef.current);
      setIsPlaying(false);
      setCurrentTime(audioRef.current.duration);
    };

    // Handle audio pause
    audioRef.current.onpause = () => {
      clearInterval(intervalRef.current);
      setIsPlaying(false);
    };
  };

  // Cleanup on component unmount and when message changes (for object URLs)
  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      // Revoke object URL if it was created for WebRTC audio
      if (message.sentViaWebRTC && message.audioUrl) {
        URL.revokeObjectURL(message.audioUrl);
      }
    };
  }, [message]); // Dependency on message to re-run cleanup if message changes

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
        {message.quotedMessage && ( // Changed to message
          <div className="bg-primary/10 border-l-4 border-primary mb-2 px-3 py-2 text-sm rounded-md shadow-sm flex flex-col">
            <span className="font-semibold text-primary">
              {message.quotedMessage.senderName || 'Unknown'}: // Changed to message
            </span>
            <span className="text-text-primary">
              {message.quotedMessage.content || '[No content]'} // Changed to message
            </span>
            {message.quotedMessage.replyTo && ( // Changed to message
              <span className="italic text-xs ml-2 text-primary"></span>
            )}
          </div>
        )}
        <div
          className={`px-4 py-2 rounded-2xl ${
            isSentByMe
              ? 'bg-primary text-primary-foreground rounded-tr-none'
              : 'bg-background border border-foreground text-text-primary rounded-tl-none shadow-sm'
          }`}
          style={{ position: 'relative' }}
        >
          {message.isAudioMessage ? ( // Changed to message
            <div className="flex items-center bg-gray-800 p-3 rounded-lg">
              <button 
                onClick={handlePlayAudio} 
                className="flex items-center justify-center w-8 h-8 bg-primary rounded-full hover:bg-primary/90 transition-colors"
              >
                {isPlaying ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.586-2.143A1 1 0 009 10.5v3a1 1 0 001.166.832l3.586-2.143a1 1 0 000-1.664z" />
                  </svg>
                )}
              </button>
              
              {/* Waveform visualization */}
              <div className="flex-1 mx-3 flex items-center space-x-0.5">
                {Array.from({ length: 20 }, (_, i) => {
                  // Simple waveform bars with varying heights
                  const height = Math.random() * 12 + 4;
                  // Use audioRef.current.duration for accurate progress
                  const isActive = audioRef.current && (i / 20) * audioRef.current.duration <= currentTime;
                  return (
                    <div
                      key={i}
                      className={`w-1 rounded-full transition-all duration-300 ${
                        isActive ? 'bg-primary' : 'bg-gray-500'
                      }`}
                      style={{ height: `${height}px` }}
                    />
                  );
                })}
              </div>

              {/* Progress bar */}
              <div className="flex-1 mx-2">
                <div className="h-1 bg-gray-600 rounded-full">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-300" 
                    style={{ width: `${(currentTime / (audioRef.current?.duration || 1)) * 100}%` }} // Use audioRef.current.duration
                  />
                </div>
              </div>

              {/* Time display */}
              <span className="text-white text-sm font-mono min-w-[60px] text-right">
                {`${formatAudioTime(currentTime)} / ${formatAudioTime(audioRef.current?.duration || message.audioDuration)}`} // Use audioRef.current.duration
              </span>
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words min-w-[80px]">
              {message?.content || '[No content]'} // Changed to message
            </p>
          )}
        </div>
        <div className={`text-xs mt-1 ${isSentByMe ? 'text-right mr-1' : 'ml-1'} text-text-secondary`}>
          {formatTime(createdAt)}
        </div>
        {isSentByMe && messageRead && isLastMessage && (
          <div className="text-xs mt-1 text-right mr-1 text-green-500 font-semibold">
            {getReadTime(readTime)}
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
