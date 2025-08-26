import React, { useState, useEffect, useRef, useCallback } from "react";
import { IoIosSend, IoIosMic } from "react-icons/io";
import { FaLock, FaTrash, FaPause, FaPlay } from "react-icons/fa";
import { useReactMediaRecorder } from "react-media-recorder";
import { useDispatch, useSelector } from "react-redux";
import { sendMessageThunk } from "../../store/slice/message/message.thunk";
import { addReceivedWebRTCAudioMessage } from '../../store/slice/message/message.slice'; // Import the new action
import { useSocket } from "../../context/SocketContext";
import Peer from 'simple-peer'; // Import simple-peer

const WEBRTC_TIMEOUT = 5000; // 5 seconds timeout for WebRTC connection

const SendMessage = ({ replyMessage, onCancelReply }) => {
  const dispatch = useDispatch();
  const { selectedUser, userProfile } = useSelector((state) => state.userReducer);
  const socket = useSocket();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Typing state
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // --- Voice Recording State & Refs ---
  const [isRecording, setIsRecording] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showCancelHint, setShowCancelHint] = useState(false);
  const [showLockHint, setShowLockHint] = useState(false);
  
  const startPos = useRef({ x: 0, y: 0 });
  const timerRef = useRef(null);
  const isCancelledRef = useRef(false);
  const holdTimeoutRef = useRef(null);

  // --- WebRTC State & Refs ---
  const peerRef = useRef(null);
  const streamRef = useRef(null);
  const dataChannelRef = useRef(null);
  const audioChunksRef = useRef([]);
  const peerConnectionTimeoutRef = useRef(null); // Ref for the WebRTC connection timeout

  const onStop = (blobUrl, blob) => {
    clearInterval(timerRef.current);
    setRecordingTime(0);
    if (isCancelledRef.current) {
      isCancelledRef.current = false;
      return;
    }
    if (blob) {
      handleSendAudioMessage(blob);
    }
  };

  const { startRecording, stopRecording, pauseRecording, resumeRecording, status, mediaRecorder } = useReactMediaRecorder({
    audio: true,
    onStop,
  });

  // Use a ref to get the latest status inside callbacks without making them dependencies
  const statusRef = useRef(status);
  statusRef.current = status;

  const resetRecordingUI = useCallback(() => {
    setIsRecording(false);
    setIsLocked(false);
    setIsPaused(false);
    setDragOffset({ x: 0, y: 0 });
    setShowCancelHint(false);
    setShowLockHint(false);
  }, []);

  const handleInteractionMove = useCallback((e) => {
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const dx = clientX - startPos.current.x;
    const dy = clientY - startPos.current.y;

    setDragOffset({ x: dx, y: dy });

    const isBeyondCancel = dx < -80;
    const isBeyondLock = dy < -80;

    setShowCancelHint(isBeyondCancel);
    setShowLockHint(isBeyondLock);

    if (isBeyondCancel) {
      isCancelledRef.current = true;
      stopRecording();
      resetRecordingUI();
    } else if (isBeyondLock) {
      setIsLocked(true);
      setDragOffset({ x: 0, y: 0 });
    }
  }, [resetRecordingUI, stopRecording]);

  const handleInteractionEnd = useCallback(() => {
    clearTimeout(holdTimeoutRef.current);
    
    if (statusRef.current === 'recording') {
      stopRecording();
    }
    resetRecordingUI();
  }, [resetRecordingUI, stopRecording]);

  useEffect(() => {
    // This effect declaratively manages the window event listeners
    if (isRecording && !isLocked) {
      window.addEventListener('mousemove', handleInteractionMove);
      window.addEventListener('mouseup', handleInteractionEnd);
      window.addEventListener('touchmove', handleInteractionMove, { passive: false });
      window.addEventListener('touchend', handleInteractionEnd);

      return () => {
        window.removeEventListener('mousemove', handleInteractionMove);
        window.removeEventListener('mouseup', handleInteractionEnd);
        window.removeEventListener('touchmove', handleInteractionMove);
        window.removeEventListener('touchend', handleInteractionEnd);
      };
    }
  }, [isRecording, isLocked, handleInteractionMove, handleInteractionEnd]);

  const handleInteractionStart = useCallback((e) => {
    e.preventDefault();
    isCancelledRef.current = false;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    startPos.current = { x: clientX, y: clientY };

    holdTimeoutRef.current = setTimeout(() => {
      startRecording();
      setIsRecording(true);
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }, 500);
  }, [startRecording]);

  useEffect(() => {
    // Cleanup timeouts on unmount
    return () => {
      clearTimeout(holdTimeoutRef.current);
      clearInterval(timerRef.current);
    }
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!message.trim() || isSubmitting) return;
    setIsSubmitting(true);
    const messageToSend = message;
    setMessage("");
    if (replyMessage) onCancelReply();
    
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
      if (isTyping) {
        socket.emit("stopTyping", { senderId: userProfile._id, receiverId: selectedUser._id });
        setIsTyping(false);
        clearTimeout(typingTimeoutRef.current);
      }
    }
  }, [message, selectedUser, replyMessage, onCancelReply, isTyping, socket, userProfile, dispatch, isSubmitting]);

  // New helper function to send audio via server (fallback)
  const sendAudioToServer = async (audioBlob, audioDuration) => {
    console.log("WebRTC failed or timed out, sending audio via server...");
    try {
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
        audioDuration: audioDuration,
      }));
      console.log("Audio sent to server successfully.");
    } catch (error) {
      console.error("Error sending audio message to server:", error);
    } finally {
      setIsSubmitting(false);
      if (replyMessage) onCancelReply();
    }
  };

  const handleSendAudioMessage = async (audioBlob) => {
    if (!audioBlob || isSubmitting || !selectedUser || !userProfile) return;
    setIsSubmitting(true);

    const audioDuration = Math.round(audioBlob.duration || 0); // Get duration, default to 0

    try {
      // Attempt WebRTC connection first
      const mediaStream = mediaRecorder.stream;
      streamRef.current = mediaStream;

      const peer = new Peer({
        initiator: true, // Sender initiates the connection
        trickle: false, // Send all ICE candidates at once
        stream: mediaStream, // Add the audio stream to the peer connection
      });

      peerRef.current = peer;

      // Set a timeout for WebRTC connection
      peerConnectionTimeoutRef.current = setTimeout(() => {
        console.warn("WebRTC connection timed out. Falling back to server upload.");
        peer.destroy(); // Clean up the peer connection
        sendAudioToServer(audioBlob, audioDuration);
      }, WEBRTC_TIMEOUT);

      peer.on('signal', (data) => {
        // Send signaling data to the other peer via the server
        socket.emit('webrtc-signal', {
          recipientId: selectedUser._id,
          senderId: userProfile._id,
          signalData: data,
        });
      });

      peer.on('connect', () => {
        console.log('WebRTC CONNECTED');
        clearTimeout(peerConnectionTimeoutRef.current); // Clear timeout on successful connection

        // Create a data channel to send the audio blob
        dataChannelRef.current = peer.createDataChannel('audio-message');
        dataChannelRef.current.binaryType = 'arraybuffer';

        dataChannelRef.current.onopen = () => {
          console.log('Data channel opened, sending audio...');
          // Send the audio blob through the data channel
          const reader = new FileReader();
          reader.onload = (e) => {
            dataChannelRef.current.send(e.target.result);
            console.log('Audio sent via data channel.');
            // After sending, notify the server that an audio message was sent
            dispatch(sendMessageThunk({
              receiverId: selectedUser._id,
              message: '[Voice Message]',
              replyTo: replyMessage?._id,
              isAudioMessage: true, // Indicate that this is an audio message
              audioDuration: audioDuration, // Still send duration for display
              sentViaWebRTC: true, // New flag to indicate WebRTC transfer
            }));
            setIsSubmitting(false);
            if (replyMessage) onCancelReply();
          };
          reader.readAsArrayBuffer(audioBlob);
        };

        dataChannelRef.current.onclose = () => {
          console.log('Data channel closed.');
        };

        dataChannelRef.current.onerror = (err) => {
          console.error('Data channel error:', err);
          // Fallback to server upload if data channel fails after connection
          sendAudioToServer(audioBlob, audioDuration);
        };
      });

      peer.on('stream', (stream) => {
        console.log('Received remote stream (should not happen for audio send):', stream);
      });

      peer.on('error', (err) => {
        console.error('WebRTC peer error:', err);
        clearTimeout(peerConnectionTimeoutRef.current); // Clear timeout on error
        // Fallback to server upload on peer error
        sendAudioToServer(audioBlob, audioDuration);
      });

      peer.on('close', () => {
        console.log('WebRTC peer closed.');
        clearTimeout(peerConnectionTimeoutRef.current); // Clear timeout on close
        // If not already handled by connect/error, ensure submitting state is reset
        if (isSubmitting) {
          setIsSubmitting(false);
          if (replyMessage) onCancelReply();
        }
        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      });

    } catch (error) {
      console.error("Error setting up WebRTC for audio message:", error);
      clearTimeout(peerConnectionTimeoutRef.current); // Clear timeout on initial setup error
      // Fallback to server upload on initial setup error
      sendAudioToServer(audioBlob, audioDuration);
    }
  };

  // --- WebRTC Signaling Handling (Receiver Side) ---
  useEffect(() => {
    if (!socket || !userProfile) return;

    socket.on('webrtc-signal', async ({ senderId, signalData }) => {
      console.log('Received WebRTC signal from:', senderId);
      let peer = peerRef.current;

      if (!peer) {
        // If no peer exists, create one (this is the receiver's side)
        peer = new Peer({
          initiator: false, // Receiver does not initiate
          trickle: false,
        });
        peerRef.current = peer;

        peer.on('signal', (data) => {
          socket.emit('webrtc-signal', {
            recipientId: senderId,
            senderId: userProfile._id,
            signalData: data,
          });
        });

        peer.on('connect', () => {
          console.log('WebRTC CONNECTED (Receiver)');
        });

        peer.on('data', (data) => {
          // Handle incoming audio data
          console.log('Received audio data via data channel.');
          audioChunksRef.current.push(data);
        });

        peer.on('stream', (stream) => {
          console.log('Received remote stream (Receiver):', stream);
        });

        peer.on('close', () => {
          console.log('WebRTC peer closed (Receiver).');
          // Process received audio chunks
          if (audioChunksRef.current.length > 0) {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); // Adjust type if needed
            console.log('Final received audio blob:', audioBlob);

            // Dispatch the action to add the received audio message to Redux store
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            audioBlob.arrayBuffer().then(arrayBuffer => {
                audioContext.decodeAudioData(arrayBuffer).then(audioBuffer => {
                    const duration = Math.round(audioBuffer.duration);
                    dispatch(addReceivedWebRTCAudioMessage({
                        senderId: senderId, // The sender of the audio
                        audioBlob: audioBlob,
                        audioDuration: duration,
                    }));
                }).catch(e => console.error("Error decoding audio data:", e));
            }).catch(e => console.error("Error reading audio blob as array buffer:", e));

            audioChunksRef.current = []; // Clear chunks
          }
          // Clean up stream
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
        });

        peer.on('error', (err) => {
          console.error('WebRTC peer error (Receiver):', err);
        });
      }

      // Apply the received signal data
      peer.signal(signalData);
    });

    return () => {
      socket.off('webrtc-signal');
      // Clean up peer connection and timeout on unmount or user change
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      clearTimeout(peerConnectionTimeoutRef.current);
    };
  }, [socket, userProfile, dispatch]); // Add dispatch to dependencies


  const handleSendLockedAudio = (e) => {
    e.stopPropagation();
    stopRecording();
    resetRecordingUI();
  };

  const handleCancelLockedAudio = (e) => {
    e.stopPropagation();
    isCancelledRef.current = true;
    stopRecording();
    resetRecordingUI();
  };

  const handleTogglePause = (e) => {
    e.stopPropagation();
    if (isPaused) {
      resumeRecording();
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      pauseRecording();
      clearInterval(timerRef.current);
    }
    setIsPaused(!isPaused);
  };
  
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

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60).toString().padStart(2, '0');
    const seconds = (time % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

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
        {isLocked ? (
          <div className="flex-1 flex items-center justify-between bg-primary/10 p-2 rounded-full">
            <button onClick={handleCancelLockedAudio} title="Cancel recording">
              <FaTrash className="text-xl text-red-500 hover:text-red-700 transition-colors" />
            </button>
            <div className="text-text-primary font-medium">
              {formatTime(recordingTime)}
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
                placeholder="Type your message..."
                className={`w-full pl-4 pr-12 py-3 rounded-full border border-foreground bg-background text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary transition-all`}
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={isSubmitting || isRecording}
                style={{ opacity: isRecording ? 0 : 1 }}
              />
              
              {isRecording && (
                <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none bg-primary/10 rounded-full">
                   <span className={`text-text-secondary flex items-center gap-2 transition-opacity ${showCancelHint ? 'opacity-100' : 'opacity-50'}`}>
                      <FaTrash className="text-red-500 text-lg" />
                      Slide left to cancel
                   </span>
                   <span className="text-text-primary font-mono animate-pulse">{formatTime(recordingTime)}</span>
                   <span className={`text-text-secondary flex items-center gap-2 transition-opacity ${showLockHint ? 'opacity-100' : 'opacity-50'}`}>
                      Slide up to lock
                      <FaLock className="text-blue-500 text-lg" />
                   </span>
                </div>
              )}

            </div>
            <div className="flex items-center gap-3">
              {message.trim() === '' ? (
                 <button
                  style={{ transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` }}
                  className={`p-3 rounded-full transition-transform flex items-center justify-center cursor-pointer ${isRecording ? 'bg-red-500 text-white scale-125 animate-pulse' : 'bg-foreground text-text-secondary hover:bg-primary/20'}`}
                  onMouseDown={handleInteractionStart}
                  onTouchStart={handleInteractionStart}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <IoIosMic className="text-xl" />
                </button>
              ) : (
                 <button
                  onClick={handleSendMessage}
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
