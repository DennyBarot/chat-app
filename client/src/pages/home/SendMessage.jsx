import React, { useState, useEffect, useRef, useCallback } from "react";
import { IoIosSend, IoIosMic } from "react-icons/io";
import { FaTrash, FaPause, FaPlay } from "react-icons/fa"; // Using better icons
import { useReactMediaRecorder } from "react-media-recorder";
import { useDispatch, useSelector } from "react-redux";
import { sendMessageThunk } from "../../store/slice/message/message.thunk";
import { useSocket } from "../../context/SocketContext";

const SendMessage = ({ replyMessage, onCancelReply }) => {
  const dispatch = useDispatch();
  const { selectedUser, userProfile } = useSelector((state) => state.userReducer);
  const socket = useSocket();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

   const isSubmittingRef = useRef(false);
  // Typing state
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  // CORRECTED: Bringing back useState for isSubmitting
 
  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isLockedRecording, setIsLockedRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [startRecordingPos, setStartRecordingPos] = useState({ x: 0, y: 0 });
  const [micTransform, setMicTransform] = useState({});
  const [swipeHint, setSwipeHint] = useState(null); 
  const isCancelledRef = useRef(false); // Use ref to avoid stale state in callbacks
  const holdTimeoutRef = useRef(null);

  const onStop = async (blobUrl, blob) => {
    // If cancellation was triggered, do nothing.
    if (isCancelledRef.current) {
      isCancelledRef.current = false; // Reset for next time
      return;
    }

    if (!blob) return;

    // Send the audio
    handleSendAudioMessage(blob);
    resetRecordingState();
  };

  const { startRecording, stopRecording, pauseRecording, resumeRecording } = useReactMediaRecorder({
    audio: true,
    onStop: onStop,
  });

  const resetRecordingState = () => {
      setIsRecording(false);
    setIsLockedRecording(false);
    setIsPaused(false);
    setMicTransform({});
    setSwipeHint(null);
   
  };

  // --- Main Event Handlers for Recording ---

  const handleInteractionStart = (e) => {
    // Prevent default behavior like text selection on desktop
    e.preventDefault();
    isCancelledRef.current = false; // Reset cancellation flag


    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setStartRecordingPos({ x: clientX, y: clientY });

    holdTimeoutRef.current = setTimeout(() => {
      startRecording();
      setIsRecording(true);
      
      // Add global listeners to handle movement/release anywhere on the screen
      window.addEventListener('mousemove', handleInteractionMove);
      window.addEventListener('mouseup', handleInteractionEnd);
      window.addEventListener('touchmove', handleInteractionMove);
      window.addEventListener('touchend', handleInteractionEnd);
    }, 250); // 250ms hold to start recording
  };
  
  const handleInteractionMove = useCallback((e) => {
    if (!isRecording || isLockedRecording) return;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const dx = clientX - startRecordingPos.x;
    const dy = clientY - startRecordingPos.y;
   console.log(`Drag Distance (dy): ${dy}`);
    const CANCEL_THRESHOLD = -0; // Swipe left distance
    const LOCK_THRESHOLD = -40;   // Swipe up distance

    // Visual feedback for the mic button
    setMicTransform({ transform: `translate(${dx}px, ${dy}px)` });
    
       // NEW: Logic for visual feedback
    if (dy < LOCK_THRESHOLD) {
      setSwipeHint('lock');
    } else if (dx < CANCEL_THRESHOLD) {
      setSwipeHint('cancel');
    } else {
      setSwipeHint(null);
    }
    
    // Check for swipe left to cancel
    if (dx < CANCEL_THRESHOLD) {
      isCancelledRef.current = true;
      stopRecording();
      resetRecordingState();
      handleInteractionEnd(); // Clean up listeners
    }
    
    // Check for swipe up to lock
    if (dy < LOCK_THRESHOLD) {
      setIsLockedRecording(true);
      setMicTransform({}); // Snap button back to place
      handleInteractionEnd(); // Clean up listeners, but recording continues
    }
  }, [isRecording, isLockedRecording, startRecordingPos.x, startRecordingPos.y, stopRecording]);

  const handleInteractionEnd = () => {
    // Clear the hold timeout if user releases before it triggers
    clearTimeout(holdTimeoutRef.current);
    
    // Clean up global event listeners
    window.removeEventListener('mousemove', handleInteractionMove);
    window.removeEventListener('mouseup', handleInteractionEnd);
    window.removeEventListener('touchmove', handleInteractionMove);
    window.removeEventListener('touchend', handleInteractionEnd);

    // If it wasn't locked or cancelled, releasing the button sends the message
    if (isRecording && !isLockedRecording) {
      stopRecording();
    }
  };


  // --- Sending Logic ---

  const handleSendMessage = useCallback(async () => {
    if (!message.trim() || isSubmitting) return;
    setIsSubmitting(true);
    const messageToSend = message;
    setMessage("");
    if (replyMessage) onCancelReply();
     setIsSubmitting(true);
    
    try {
      await dispatch(sendMessageThunk({
        receiverId: selectedUser?._id,
        message: messageToSend,
        replyTo: replyMessage?._id,
      }));
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSubmitting(false);
      // Stop typing emitter
      if (isTyping) {
        socket.emit("stopTyping", { senderId: userProfile._id, receiverId: selectedUser._id });
        setIsTyping(false);
        clearTimeout(typingTimeoutRef.current);
      }
    }
  }, [message, selectedUser, replyMessage, onCancelReply, isTyping, socket, userProfile, dispatch, isSubmitting]);

  const handleSendAudioMessage = async (audioBlob) => {
   // CORRECTED: Use the isSubmitting state here as well
    if (!audioBlob || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const duration = Math.round(audioBuffer.duration);

      const base64Audio = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
      });

      await dispatch(sendMessageThunk({
        receiverId: selectedUser?._id,
        message: '[Voice Message]',
        replyTo: replyMessage?._id,
        audioData: base64Audio,
        audioDuration: duration,
      }));

    } catch (error) {
      console.error("Error sending audio message:", error);
    } finally {
      setIsSubmitting(false);
      if (replyMessage) onCancelReply();
    }
  };

  const handleSendLockedAudio = () => {
    stopRecording(); // This triggers onStop, which calls handleSendAudioMessage
  };

  const handleCancelLockedAudio = () => {
    isCancelledRef.current = true;
    stopRecording();
    resetRecordingState();
  };

  const handleTogglePause = () => {
    if (isPaused) {
      resumeRecording();
    } else {
      pauseRecording();
    }
    setIsPaused(!isPaused);
  };
  
  // --- Input and Typing Handlers ---
  
  const handleInputChange = useCallback((e) => {
    setMessage(e.target.value);
    if (!socket || !userProfile || !selectedUser) return;
    if (!isTyping) {
      setIsTyping(true);
      socket.emit("typing", { senderId: userProfile._id, receiverId: selectedUser._id });
    }
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit("stopTyping", { senderId: userProfile._id, receiverId: selectedUser._id });
    }, 1000);
  }, [socket, userProfile, selectedUser, isTyping]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  useEffect(() => {
    // Cleanup timeouts on unmount
    return () => {
      clearTimeout(typingTimeoutRef.current);
      clearTimeout(holdTimeoutRef.current);
    };
  }, []);

  return (
    <div className="p-4 bg-background border-t border-foreground">
      {replyMessage && (
        <div className="bg-primary/10 border-l-4 border-primary mb-2 px-3 py-2 text-sm rounded-md shadow flex items-center justify-between">
          <div>
            <span className="font-semibold text-primary">Replying to:</span>
            <span className="text-text-primary ml-1">{replyMessage.content}</span>
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
        {isLockedRecording ? (
          <div className="flex-1 flex items-center justify-between bg-primary/10 p-2 rounded-full">
            <button onClick={handleCancelLockedAudio} title="Cancel recording">
              <FaTrash className="text-xl text-red-500 hover:text-red-700 transition-colors" />
            </button>
            <div className="text-text-primary font-medium">
              {isPaused ? "Paused" : "Recording..."}
            </div>
            <div className="flex items-center gap-4">
              <button onClick={handleTogglePause} title={isPaused ? "Resume" : "Pause"}>
                {isPaused ? <FaPlay className="text-xl text-primary" /> : <FaPause className="text-xl text-primary" />}
              </button>
              <button onClick={handleSendLockedAudio} title="Send voice message"
                 className="p-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center shadow-md">
                <IoIosSend className="text-xl" />
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 relative">
              <input
                 type="text"
                placeholder={isRecording ? "Slide left to cancel, up to lock" : "Type your message..."}
                className={`w-full pl-4 pr-12 py-3 rounded-full border border-foreground bg-background text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary transition-all ${isRecording ? 'placeholder:text-center' : ''}`}
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={isSubmitting || isRecording}
              />
              
              {isRecording && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                   <span className="text-text-secondary animate-pulse flex items-center gap-4">
                      {swipeHint === 'cancel' && <FaTrash className="text-red-500 text-xl" />}
                      Slide left to cancel
                      <span className="mx-4">|</span>
                      Slide up to lock
                      {swipeHint === 'lock' && <FaLock className="text-blue-500 text-xl" />}
                   </span>
                </div>
              )}

            </div>
            <div className="flex items-center gap-3">
              {message.trim() === '' && (
                 <button
                  onMouseDown={handleInteractionStart}
                  onTouchStart={handleInteractionStart}
                  style={micTransform}
                  className={`p-3 rounded-full transition-all flex items-center justify-center cursor-pointer ${isRecording ? 'bg-red-500 text-white scale-125 animate-pulse' : 'bg-foreground text-text-secondary hover:bg-primary/20'}`}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <IoIosMic className="text-xl" />
                </button>
                  )}
            {message.trim() !== '' && (
                 <button
                  onClick={handleSendMessage}
                  // CORRECTED: This is the line that caused the ReferenceError
                  disabled={isSubmitting}
                  className="p-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center disabled:bg-foreground disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <IoIosSend className="text-xl" />
                  )}
                </button>

              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SendMessage;