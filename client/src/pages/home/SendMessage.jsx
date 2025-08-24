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
  const typingTimeoutRef = useRef(null);

  // State for voice recording
  const { status, startRecording, stopRecording, mediaBlobUrl } = useReactMediaRecorder({
    audio: true,
    onStop: async (blobUrl, blob) => {
      setAudioBlob(blob);
      setIsRecording(false);
      
      // Get audio duration using a more reliable method
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // Calculate duration in seconds and round to nearest integer
        const duration = Math.round(audioBuffer.duration);
        console.log("Audio duration calculated:", duration);
        setAudioDuration(duration);
      } catch (error) {
        console.error("Error calculating audio duration:", error);
        // Fallback: estimate duration based on blob size (very rough estimate)
        // Average audio bitrate is around 64kbps for voice recordings
        const estimatedDuration = Math.round((blob.size * 8) / (64 * 1024));
        console.log("Estimated audio duration:", estimatedDuration);
        setAudioDuration(estimatedDuration || 5); // Default to 5 seconds if estimation fails
      }
    }
  });

  const handleSendMessage = useCallback(async () => {
    if (!message.trim()) return;

    // Optimistically clear the input field immediately
    const messageToSend = message;
    setMessage("");
    if (replyMessage) onCancelReply();
    
    // Only show loading for a very brief moment to indicate action was triggered
    setIsSubmitting(true);
    
    // Immediately set submitting to false since message appears via socket
    setTimeout(() => {
      setIsSubmitting(false);
    }, 100); // Very brief loading state
    
    try {
      // Send message in background without blocking UI
      await dispatch(sendMessageThunk({
        receiverId: selectedUser?._id,
        message: messageToSend,
        replyTo: replyMessage?._id,
      }));
      // Call scrollToBottom after successful dispatch
    
    } catch (error) {
      console.error("Error sending message:", error);
      // Optionally show a toast error here
      // In case of error, user can retype the message
    } finally {
      // Ensure typing indicator is off
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

    // If message is not empty and user is not already marked as typing
    if (e.target.value.length > 0 && !isTyping) {
      setIsTyping(true);
      socket.emit("typing", { senderId: userProfile._id, receiverId: selectedUser._id });
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set a new timeout to emit stopTyping after a delay
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit("stopTyping", { senderId: userProfile._id, receiverId: selectedUser._id });
    }, 1000); // 1 second debounce

    // If message becomes empty, immediately send stopTyping
    if (e.target.value.length === 0 && isTyping) {
      setIsTyping(false);
      socket.emit("stopTyping", { senderId: userProfile._id, receiverId: selectedUser._id });
      clearTimeout(typingTimeoutRef.current);
    }
  }, [socket, userProfile, selectedUser, isTyping]);

  const handleRecordAudio = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
      setIsRecording(true);
    }
  };

  const handleSendAudioMessage = async () => {
    if (!audioBlob) return;

    setIsSubmitting(true);
    
    try {
      // Convert audio blob to Base64
      const base64Audio = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
      });
      
      // Send the audio message with Base64 data
      await dispatch(sendMessageThunk({
        receiverId: selectedUser?._id,
        message: '[Voice Message]', // Placeholder text
        replyTo: replyMessage?._id,
        audioData: base64Audio,
        audioDuration: audioDuration
      }));
      
      // Optimistically clear the input field immediately
      setAudioBlob(null);
      if (replyMessage) onCancelReply();

      // Immediately set submitting to false since message appears via socket
      setTimeout(() => {
        setIsSubmitting(false);
      }, 100); // Very brief loading state
      
    } catch (error) {
      console.error("Error sending audio message:", error);
      // In case of error, user can retry sending the audio
      // No need to set setIsSubmitting(false) here, as finally will handle it
    } finally {
      // Ensure loading state is cleared after the entire operation completes
      // This acts as a failsafe in case the setTimeout is somehow missed or delayed
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  useEffect(() => {
    // Cleanup timeout on component unmount
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
        </div>

        <button
          onClick={handleRecordAudio}
          className={`p-3 rounded-full ${
            isRecording
              ? "bg-red-500 text-white animate-pulse"
              : "bg-foreground text-text-secondary hover:bg-primary/20"
          } transition-colors flex items-center justify-center`}
        >
          <IoIosMic className="text-xl" />
        </button>

        <button
          onClick={audioBlob ? handleSendAudioMessage : handleSendMessage}
          disabled={(!message.trim() && !audioBlob) || isSubmitting}
          className={`p-3 rounded-full ${
            (message.trim() || audioBlob) && !isSubmitting
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
      </div>
    </div>
  );
};

export default SendMessage;
