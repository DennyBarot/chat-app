import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  setCallAccepted,
  setCallEnded,
  setStream,
  resetCallState,
  clearIceCandidates,
} from '../store/slice/call/call.slice';
import { useSocket } from '../context/SocketContext';

function resetPeerAndMedia(connectionRef, currentStreamRef, myVideo, userVideo) {
  if (connectionRef.current) {
    connectionRef.current.onicecandidate = null;
    connectionRef.current.ontrack = null;
    connectionRef.current.onconnectionstatechange = null;
    connectionRef.current.close();
    connectionRef.current = null;
  }
  if (currentStreamRef.current) {
    currentStreamRef.current.getTracks().forEach(track => {
      track.stop();
    });
    currentStreamRef.current = null;
  }
  if (myVideo.current) {
    myVideo.current.srcObject = null;
    myVideo.current.load();
  }
  if (userVideo.current) {
    userVideo.current.srcObject = null;
    userVideo.current.load();
  }
}


const CallModal = () => {
  const dispatch = useDispatch();
  const socket = useSocket();
  const {
    callAccepted,
    callEnded,
    stream,
    receivingCall,
    caller,
    callerSignal,
    idToCall,
    name,
    answerSignal,
    iceCandidates,
  } = useSelector((state) => state.callReducer);
  const { userProfile } = useSelector((state) => state.userReducer);

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef(null);
  const currentStreamRef = useRef(null);
  const callEndedRef = useRef(false);

  useEffect(() => {
    currentStreamRef.current = stream;
  }, [stream]);

  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [callStatus, setCallStatus] = useState('');

  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  // --- FIX: Always do full cleanup on call end ---
  const handleCallEnd = useCallback(() => {
    if (callEndedRef.current) {
      console.log('Call cleanup already in progress, skipping...');
      return;
    }
    callEndedRef.current = true;

    resetPeerAndMedia(connectionRef, currentStreamRef, myVideo, userVideo);

    setCallStatus('');
    setIsAudioMuted(false);
    setIsVideoMuted(false);
    dispatch(resetCallState());

    console.log('Call cleanup completed');
  }, [dispatch]);

  // Get user media
  useEffect(() => {
    if ((idToCall || receivingCall) && !stream) {
      setCallStatus('requesting-media');
      navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: { echoCancellation: true, noiseSuppression: true }
      })
        .then((mediaStream) => {
          dispatch(setStream(mediaStream));
          setCallStatus('media-ready');
        })
        .catch((error) => {
          alert('Could not access camera and microphone. Please check permissions.');
          dispatch(resetCallState());
        });
    }
  }, [idToCall, receivingCall, stream, dispatch]);

  // Attach stream to local video
  useEffect(() => {
    if (stream && myVideo.current) {
      myVideo.current.srcObject = stream;
    }
  }, [stream]);

  // --- Peer connection utilities ---
  const createPeerConnection = useCallback(() => {
    const peerConnection = new RTCPeerConnection(iceServers);

    if (stream) {
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });
    }

    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        const targetUser = idToCall || caller;
        if (targetUser) {
          socket.emit('ice-candidate', {
            to: targetUser,
            candidate: event.candidate
          });
        }
      }
    };

    peerConnection.ontrack = (event) => {
      if (userVideo.current && event.streams[0]) {
        userVideo.current.srcObject = event.streams[0];
      }
    };

    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === 'connected') {
        setCallStatus('connected');
      } else if (
        peerConnection.connectionState === 'disconnected' ||
        peerConnection.connectionState === 'failed'
      ) {
        handleCallEnd();
      }
    };

    return peerConnection;
  }, [stream, socket, idToCall, caller, handleCallEnd]);

  // --- Outgoing call (FIX: Always start with clean state) ---
  const callUser = useCallback(async () => {
    dispatch(resetCallState());
    callEndedRef.current = false;

    if (!stream || !socket || !idToCall) {
      return;
    }

    setCallStatus('calling');
    const peerConnection = createPeerConnection();
    connectionRef.current = peerConnection;

    try {
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await peerConnection.setLocalDescription(offer);

      socket.emit('call-user', {
        userToCall: idToCall,
        signal: offer,
        from: userProfile._id,
        name: userProfile.fullName || userProfile.username || 'Unknown',
      });
    } catch (error) {
      dispatch(setCallEnded(true));
    }
  }, [stream, socket, idToCall, userProfile, createPeerConnection, dispatch]);

  // Incoming calls
  const answerCall = useCallback(async () => {
    if (!stream || !socket || !callerSignal || !caller) return;
    setCallStatus('connecting');
    dispatch(setCallAccepted(true));

    const peerConnection = createPeerConnection();
    connectionRef.current = peerConnection;

    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(callerSignal));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socket.emit('answer-call', {
        signal: answer,
        to: caller,
      });
    } catch (error) {
      dispatch(setCallEnded(true));
    }
  }, [stream, socket, callerSignal, caller, createPeerConnection, dispatch]);

  // --- FIX: Only set remote description if needed ---
  useEffect(() => {
    if (connectionRef.current && answerSignal && !connectionRef.current.currentRemoteDescription) {
      connectionRef.current.setRemoteDescription(new RTCSessionDescription(answerSignal))
        .then(() => setCallStatus('connected'))
        .catch(() => dispatch(setCallEnded(true)));
    }
  }, [answerSignal, dispatch]);

  // ICE candidates
  useEffect(() => {
    if (connectionRef.current && iceCandidates.length > 0) {
      iceCandidates.forEach(candidate => {
        connectionRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      });
      dispatch(clearIceCandidates());
    }
  }, [iceCandidates, dispatch]);

  // Auto call when ready
  useEffect(() => {
    if (idToCall && stream && socket && !callAccepted && !receivingCall) {
      callUser();
    }
  }, [idToCall, stream, socket, callAccepted, receivingCall, callUser]);

  // --- Always reset clean flag for new calls ---
  useEffect(() => {
    if (idToCall || receivingCall) {
      callEndedRef.current = false;
    }
  }, [idToCall, receivingCall]);

  // On callEnded, clean up everything
  useEffect(() => {
    if (callEnded) {
      handleCallEnd();
    }
  }, [callEnded, handleCallEnd]);

  // --- Component cleanup: always do hard cleanup! ---
  useEffect(() => {
    return () => {
      resetPeerAndMedia(connectionRef, currentStreamRef, myVideo, userVideo);
    };
  }, []);

  // Call controls
  const leaveCall = useCallback(() => {
    const remoteUser = caller || idToCall;
    if (remoteUser && socket) {
      socket.emit('end-call', { to: remoteUser });
    }
    dispatch(setCallEnded(true));
  }, [caller, idToCall, socket, dispatch]);

  const declineCall = useCallback(() => {
    if (caller && socket) {
      socket.emit('reject-call', { to: caller });
    }
    dispatch(resetCallState());
  }, [caller, socket, dispatch]);

  const cancelCall = useCallback(() => {
    if (idToCall && socket) {
      socket.emit('end-call', { to: idToCall });
    }
    dispatch(setCallEnded(true));
  }, [idToCall, socket, dispatch]);

  const toggleAudio = useCallback(() => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsAudioMuted(prev => !prev);
    }
  }, [stream]);

  const toggleVideo = useCallback(() => {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoMuted(prev => !prev);
    }
  }, [stream]);

  if (!idToCall && !receivingCall && !callAccepted) {
    return null;
  }

  return (
    <>
      {/* Incoming call modal */}
      {receivingCall && !callAccepted && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-20 h-20 bg-blue-500 rounded-full mx-auto flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">
                Incoming Call
              </h3>
              <p className="text-gray-600 mb-6">
                {name || 'Someone'} is calling you...
              </p>
              <div className="flex space-x-4 justify-center">
                <button 
                  onClick={answerCall} 
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-full flex items-center space-x-2 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  <span>Answer</span>
                </button>
                <button 
                  onClick={declineCall} 
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full flex items-center space-x-2 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                  </svg>
                  <span>Decline</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Outgoing call modal */}
      {idToCall && !callAccepted && !callEnded && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-20 h-20 bg-blue-500 rounded-full mx-auto flex items-center justify-center mb-4 animate-pulse">
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">
                {callStatus === 'requesting-media' ? 'Requesting permissions...' : 
                 callStatus === 'calling' ? 'Calling...' : 'Connecting...'}
              </h3>
              <p className="text-gray-600 mb-6">
                {callStatus === 'requesting-media' ? 'Please allow camera and microphone access' :
                 'Waiting for response...'}
              </p>
              <button 
                onClick={cancelCall} 
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full flex items-center space-x-2 mx-auto transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                </svg>
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active call modal */}
      {callAccepted && !callEnded && (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
          <div className="relative w-full h-full">
            {/* Remote Video (main view) */}
            <video 
              playsInline 
              ref={userVideo} 
              autoPlay 
              className="w-full h-full object-cover bg-gray-900"
            />
            
            {/* Local Video (picture-in-picture) */}
            <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-white shadow-lg">
              <video 
                playsInline 
                muted 
                ref={myVideo} 
                autoPlay 
                className="w-full h-full object-cover"
              />
            </div>

            {/* Call status indicator */}
            {callStatus && callStatus !== 'connected' && (
              <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg">
                {callStatus === 'connecting' ? 'Connecting...' : callStatus}
              </div>
            )}

            {/* Call controls */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-4">
              <button 
                onClick={toggleAudio} 
                className={`p-4 rounded-full transition-all ${
                  isAudioMuted 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-gray-700 hover:bg-gray-600'
                } text-white shadow-lg`}
                title={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
              >
                {isAudioMuted ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              
              <button 
                onClick={toggleVideo} 
                className={`p-4 rounded-full transition-all ${
                  isVideoMuted 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-gray-700 hover:bg-gray-600'
                } text-white shadow-lg`}
                title={isVideoMuted ? 'Unmute Video' : 'Mute Video'}
              >
                {isVideoMuted ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                  </svg>
                )}
              </button>
              
              <button 
                onClick={leaveCall} 
                className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg transition-all"
                title="End Call"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CallModal;