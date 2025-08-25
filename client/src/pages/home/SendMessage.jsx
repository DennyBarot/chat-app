import React, { useState, useEffect, useRef, useCallback } from "react";
import { IoIosSend, IoIosMic } from "react-icons/io";
import { useReactMediaRecorder } from "react-media-recorder"; // Importing a library for audio recording
import { useDispatch, useSelector } from "react-redux";
import { sendMessageThunk } from "../../store/slice/message/message.thunk";
import { axiosInstance } from "../../components/utilities/axiosInstance";
import { useSocket } from "../../context/SocketContext";

const SendMessage = ({ replyMessage, onCancelReply, scrollToBottom }) => {
  const dispatch = useDispatch();
  const { selectedUser, userProfile } = useSelector((state) => state.userReducer);
  const socket = useSocket();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [startRecordingPos, setStartRecordingPos] = useState({ x: 0, y: 0 });
  const [isCancelling, setIsCancelling] = useState(false);
  const [isLockedRecording, setIsLockedRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transformStyle, setTransformStyle] = useState({});
  const [swipeDirection, setSwipeDirection] = useState(null); // 'none', 'left', 'up'
  const typingTimeoutRef = useRef(null);

  // State for voice recording
  const { status, startRecording, stopRecording, mediaBlobUrl, pauseRecording, resumeRecording } = useReactMediaRecorder({
    audio: true,
    onStop: async (blobUrl, blob) => {
      console.log("onStop callback triggered. isCancelling:", isCancelling); // Debug log
      if (isCancelling) {
        setAudioBlob(null);
        setIsRecording(false);
        setIsCancelling(false);
        setIsLockedRecording(false);
        setIsPaused(false); // Reset paused state on cancel
        return;
      }

      setAudioBlob(blob);
      setIsRecording(false);
      setIsLockedRecording(false);
      setIsPaused(false); // Reset paused state on stop
      
      // Get audio duration using a more reliable method
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const duration = Math.round(audioBuffer.duration);
        console.log("Audio duration calculated:", duration);
        setAudioDuration(duration);
      } catch (error) {
        console.error("Error calculating audio duration:", error);
        const estimatedDuration = Math.round((blob.size * 8) / (64 * 1024));
        console.log("Estimated audio duration:", estimatedDuration);
        setAudioDuration(estimatedDuration || 5);
      }
      handleSendAudioMessage();
    }
  });

  const handleSendMessage = useCallback(async () => {
    if (!message.trim()) return;

    const messageToSend = message;
    setMessage("");
    if (replyMessage) onCancelReply();
    
    setIsSubmitting(true);
    
    setTimeout(() => {
      setIsSubmitting(false);
    }, 100);
    
    try {
      await dispatch(sendMessageThunk({
        receiverId: selectedUser?._id,
        message: messageToSend,
        replyTo: replyMessage?._id,
      }));
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      if (isTyping) {
        socket.emit("stopTyping", { senderId: userProfile._id, receiverId: selectedUser._id });
        setIsTyping(false);
        clearTimeout(typingTimeoutRef.current);
      }
    }
  }, [message, selectedUser, replyMessage, onCancelReply, isTyping, socket, userProfile, dispatch]);

  const handleInputChange = useCallback((e) => {
    setMessage(e.target.value);

    if (!socket || !userProfile || !selectedUser) return;

    if (e.target.value.length > 0 && !isTyping) {
      setIsTyping(true);
      socket.emit("typing", { senderId: userProfile._id, receiverId: selectedUser._id });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit("stopTyping", { senderId: userProfile._id, receiverId: selectedUser._id });
    }, 1000);

    if (e.target.value.length === 0 && isTyping) {
      setIsTyping(false);
      socket.emit("stopTyping", { senderId: userProfile._id, receiverId: selectedUser._id });
      clearTimeout(typingTimeoutRef.current);
    }
  }, [socket, userProfile, selectedUser, isTyping]);

    const handleRecordAudioStart = (e) => {
    console.log("handleRecordAudioStart triggered"); // Debug log
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setStartRecordingPos({ x: clientX, y: clientY });
    setIsCancelling(false);
    setIsLockedRecording(false);
    setIsPaused(false); // Reset paused state
    setTransformStyle({}); // Reset transform style on start
    setSwipeDirection(null); // Reset swipe direction on start
    startRecording();
    setIsRecording(true);
  };

  const handleRecordAudioStop = () => {
    console.log("onStop callback triggered. isCancelling:", isCancelling); // Debug log
    setTransformStyle({}); // Reset transform style on stop
    setSwipeDirection(null); // Reset swipe direction on stop
    if (isCancelling) {
      console.log("handleRecordAudioStop: Cancelling recording."); // Debug log
      stopRecording();
      setAudioBlob(null);
      setAudioDuration(0);
      setIsRecording(false);
      setIsCancelling(false);
      setIsLockedRecording(false);
      setIsPaused(false); // Reset paused state on cancel
      return;
    }
    if (isLockedRecording) {
      console.log("handleRecordAudioStop: Recording is locked, not stopping."); // Debug log
      return;
    }
    console.log("handleRecordAudioStop: Stopping recording and preparing to send."); // Debug log
    stopRecording();
  };

  const handleSendAudioMessage = async () => {
    console.log("handleSendAudioMessage triggered. audioBlob:", audioBlob); // Debug log
    if (!audioBlob) return;

    setIsSubmitting(true);
    
    try {
      const base64Audio = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
      });
      
      dispatch(sendMessageThunk({
        receiverId: selectedUser?._id,
        message: '[Voice Message]',
        replyTo: replyMessage?._id,
        audioData: base64Audio,
        audioDuration: audioDuration
      }));
      
      setAudioBlob(null);
      if (replyMessage) onCancelReply();

      setTimeout(() => {
        setIsSubmitting(false);
      }, 100);
      
    } catch (error) {
      console.error("Error sending audio message:", error);
    }
  };

  const handleSendLockedAudio = () => {
    console.log("handleSendLockedAudio triggered"); // Debug log
    stopRecording();
  };

  const handleCancelLockedAudio = () => {
    console.log("handleCancelLockedAudio triggered"); // Debug log
    setTransformStyle({}); // Reset transform style on cancel
    setSwipeDirection(null); // Reset swipe direction on cancel
    stopRecording();
    setIsCancelling(true);
  };

  const handleTogglePause = () => {
    console.log("handleTogglePause triggered. isPaused:", isPaused); // Debug log
    if (isPaused) {
      resumeRecording();
    } else {
      pauseRecording();
    }
    setIsPaused(!isPaused);
  };

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handleMouseMove = useCallback((e) => {
    if (isRecording && !isLockedRecording) {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = clientX - startRecordingPos.x;
      const dy = clientY - startRecordingPos.y;

      const CANCEL_THRESHOLD = 50;
      const LOCK_THRESHOLD = -70; // Negative because moving up decreases Y

      // Update transform style for visual feedback
      setTransformStyle({ transform: `translate(${dx}px, ${dy}px)` });

      // Only determine direction if not already determined
      if (swipeDirection === null) {
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (absDx > absDy * 2 && dx < -CANCEL_THRESHOLD) { // Dominant left swipe
          setSwipeDirection('left');
          setIsCancelling(true);
          stopRecording(); // Immediately stop and cancel
          return;
        } else if (absDy > absDx * 2 && dy < LOCK_THRESHOLD) { // Dominant up swipe
          setSwipeDirection('up');
          setIsLockedRecording(true);
          // Do NOT stop recording here, it continues in locked mode
          return;
        }
      }
    }
  }, [isRecording, startRecordingPos, isLockedRecording, swipeDirection, stopRecording]);

  // Removed handleMouseLeave as it's not directly applicable to touch events for cancellation.
  // Cancellation will now primarily be handled by swiping left.

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="p-4 bg-background border-t border-foreground">
      {replyMessage && (
        <div className="bg-primary/10 border-l-4 border-primary mb-2 px-3 py-2 text-sm rounded-md shadow flex items-center justify-between">
          <div>
            <span className="font-semibold text-primary">Replying to:</span>
            <span className="text-text-primary ml-1">{replyMessage.content}</span>
            {replyMessage.replyTo && (
              <span className="italic text-xs ml-2 text-primary"></span>
            )}
          </div>
          <button
            onClick={onCancelReply}
            className="ml-4 px-2 py-1 text-xs bg-background border border-primary/30 rounded hover:bg-primary/20 transition"
          >
            Cancel
          </button>
        </div>
      )}
      <div className="flex gap-3 items-center">
        {isRecording && isLockedRecording ? (
          <div className="flex-1 flex items-center justify-between">
            <button
              onClick={handleCancelLockedAudio}
              className="p-3 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center justify-center"
            >
              Cancel
            </button>
            <span className="text-text-secondary">
              {isPaused ? "Paused" : "Recording..."}
            </span>
            <button
              onClick={handleTogglePause}
              className="p-3 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center justify-center"
            >
              {isPaused ? "Resume" : "Pause"}
            </button>
            <button
              onClick={handleSendLockedAudio}
              className="p-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center"
            >
              <IoIosSend className="text-xl" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Type your message..."
                className="w-full pl-4 pr-12 py-3 rounded-full border border-foreground bg-background text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={isSubmitting}
              />
              {isRecording && !isLockedRecording && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-gray-700 text-white text-xs rounded-md shadow-lg whitespace-nowrap">
                  Slide left to cancel, up to lock
                </div>
              )}
            </div>

            <button
              onMouseDown={handleRecordAudioStart}
              onMouseUp={handleRecordAudioStop}
              onTouchStart={handleRecordAudioStart}
              onTouchEnd={handleRecordAudioStop}
              onTouchMove={handleMouseMove}
              style={transformStyle}
              className={`p-3 rounded-full ${
                isRecording
                  ? isCancelling
                    ? "bg-red-700 text-white animate-pulse"
                    : "bg-red-500 text-white animate-pulse"
                  : "bg-foreground text-text-secondary hover:bg-primary/20"
              } transition-colors flex items-center justify-center`}
            >
              <IoIosMic className="text-xl" />
            </button>

            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || isSubmitting}
              className={`p-3 rounded-full ${
                message.trim() && !isSubmitting
                  ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                  : "bg-foreground text-text-secondary cursor-not-allowed"
              } transition-colors flex items-center justify-center`}
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <IoIosSend className="text-xl" />
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

  const handleRecordAudioStop = () => {
    console.log("onStop callback triggered. isCancelling:", isCancelling); // Debug log
    setTransformStyle({}); // Reset transform style on stop
    if (isCancelling) {
      console.log("handleRecordAudioStop: Cancelling recording."); // Debug log
      stopRecording();
      setAudioBlob(null);
      setAudioDuration(0);
      setIsRecording(false);
      setIsCancelling(false);
      setIsLockedRecording(false);
      setIsPaused(false); // Reset paused state on cancel
      return;
    }
    if (isLockedRecording) {
      console.log("handleRecordAudioStop: Recording is locked, not stopping."); // Debug log
      return;
    }
    console.log("handleRecordAudioStop: Stopping recording and preparing to send."); // Debug log
    stopRecording();
  };

  const handleSendAudioMessage = async () => {
    console.log("handleSendAudioMessage triggered. audioBlob:", audioBlob); // Debug log
    if (!audioBlob) return;

    setIsSubmitting(true);
    
    try {
      const base64Audio = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
      });
      
      dispatch(sendMessageThunk({
        receiverId: selectedUser?._id,
        message: '[Voice Message]',
        replyTo: replyMessage?._id,
        audioData: base64Audio,
        audioDuration: audioDuration
      }));
      
      setAudioBlob(null);
      if (replyMessage) onCancelReply();

      setTimeout(() => {
        setIsSubmitting(false);
      }, 100);
      
    } catch (error) {
      console.error("Error sending audio message:", error);
    }
  };

  const handleSendLockedAudio = () => {
    console.log("handleSendLockedAudio triggered"); // Debug log
    stopRecording();
  };

  const handleCancelLockedAudio = () => {
    console.log("handleCancelLockedAudio triggered"); // Debug log
    setTransformStyle({}); // Reset transform style on cancel
    stopRecording();
    setIsCancelling(true);
  };

  const handleTogglePause = () => {
    console.log("handleTogglePause triggered. isPaused:", isPaused); // Debug log
    if (isPaused) {
      resumeRecording();
    } else {
      pauseRecording();
    }
    setIsPaused(!isPaused);
  };

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handleMouseMove = useCallback((e) => {
    if (isRecording && !isLockedRecording) {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = clientX - startRecordingPos.x;
      const dy = clientY - startRecordingPos.y;

      const CANCEL_THRESHOLD = 50;
      const LOCK_THRESHOLD = -70; // Negative because moving up decreases Y

      // Update transform style for visual feedback
      setTransformStyle({ transform: `translate(${dx}px, ${dy}px)` });

      // Only determine direction if not already determined
      if (swipeDirection === null) {
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (absDx > absDy * 2 && dx < -CANCEL_THRESHOLD) { // Dominant left swipe
          setSwipeDirection('left');
          setIsCancelling(true);
          stopRecording(); // Immediately stop and cancel
          return; // Exit to prevent further processing
        } else if (absDy > absDx * 2 && dy < LOCK_THRESHOLD) { // Dominant up swipe
          setSwipeDirection('up');
          setIsLockedRecording(true);
          // Do NOT stop recording here, it continues in locked mode
          return;
        }
      }
    }
  }, [isRecording, startRecordingPos, isLockedRecording, swipeDirection, stopRecording]);

  // Removed handleMouseLeave as it's not directly applicable to touch events for cancellation.
  // Cancellation will now primarily be handled by swiping left.

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="p-4 bg-background border-t border-foreground">
      {replyMessage && (
        <div className="bg-primary/10 border-l-4 border-primary mb-2 px-3 py-2 text-sm rounded-md shadow flex items-center justify-between">
          <div>
            <span className="font-semibold text-primary">Replying to:</span>
            <span className="text-text-primary ml-1">{replyMessage.content}</span>
            {replyMessage.replyTo && (
              <span className="italic text-xs ml-2 text-primary"></span>
            )}
          </div>
          <button
            onClick={onCancelReply}
            className="ml-4 px-2 py-1 text-xs bg-background border border-primary/30 rounded hover:bg-primary/20 transition"
          >
            Cancel
          </button>
        </div>
      )}
      <div className="flex gap-3 items-center">
        {isRecording && isLockedRecording ? (
          <div className="flex-1 flex items-center justify-between">
            <button
              onClick={handleCancelLockedAudio}
              className="p-3 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center justify-center"
            >
              Cancel
            </button>
            <span className="text-text-secondary">
              {isPaused ? "Paused" : "Recording..."}
            </span>
            <button
              onClick={handleTogglePause}
              className="p-3 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center justify-center"
            >
              {isPaused ? "Resume" : "Pause"}
            </button>
            <button
              onClick={handleSendLockedAudio}
              className="p-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center"
            >
              <IoIosSend className="text-xl" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Type your message..."
                className="w-full pl-4 pr-12 py-3 rounded-full border border-foreground bg-background text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={isSubmitting}
              />
              {isRecording && !isLockedRecording && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-gray-700 text-white text-xs rounded-md shadow-lg whitespace-nowrap">
                  Slide left to cancel, up to lock
                </div>
              )}
            </div>

            <button
              onMouseDown={handleRecordAudioStart}
              onMouseUp={handleRecordAudioStop}
              onTouchStart={handleRecordAudioStart}
              onTouchEnd={handleRecordAudioStop}
              onTouchMove={handleMouseMove}
              style={transformStyle}
              className={`p-3 rounded-full ${
                isRecording
                  ? isCancelling
                    ? "bg-red-700 text-white animate-pulse"
                    : "bg-red-500 text-white animate-pulse"
                  : "bg-foreground text-text-secondary hover:bg-primary/20"
              } transition-colors flex items-center justify-center`}
            >
              <IoIosMic className="text-xl" />
            </button>

            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || isSubmitting}
              className={`p-3 rounded-full ${
                message.trim() && !isSubmitting
                  ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                  : "bg-foreground text-text-secondary cursor-not-allowed"
              } transition-colors flex items-center justify-center`}
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <IoIosSend className="text-xl" />
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );


export default SendMessage;