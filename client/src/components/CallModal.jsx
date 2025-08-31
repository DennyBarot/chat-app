import React, { useRef, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  setCallAccepted,
  setCallEnded,
  setReceivingCall,
  setCaller,
  setCallerSignal,
  setStream,
  setIdToCall,
  resetCallState,
  setAnswerSignal,
  addIceCandidate,
  clearIceCandidates,
} from '../store/slice/call/call.slice';
import { useSocket } from '../context/SocketContext';

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
    me,
    name,
    answerSignal,
    iceCandidates,
  } = useSelector((state) => state.callReducer);

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);

  // Effect to get user media
  useEffect(() => {
    if ((idToCall || receivingCall) && !stream) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((mediaStream) => {
          dispatch(setStream(mediaStream));
        })
        .catch((error) => {
          console.error('Error accessing media devices:', error);
          alert('Could not access camera and microphone.');
        });
    }
  }, [idToCall, receivingCall, stream, dispatch]);

  // Effect to handle the entire WebRTC connection lifecycle
  useEffect(() => {
    if (!socket || !stream || callEnded) return;

    // Only proceed if we are initiating or have received a call
    if (idToCall || (receivingCall && callerSignal)) {
      // 1. Create Peer Connection
      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      connectionRef.current = peerConnection;

      // 2. Add local stream to the connection
      stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

      // 3. Handle remote stream
      peerConnection.ontrack = (event) => {
        if (userVideo.current) {
          userVideo.current.srcObject = event.streams[0];
        }
      };

      // 4. Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', { to: idToCall || caller, candidate: event.candidate });
        }
      };

      // 5. Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === 'connected') {
          console.log('Peers connected!');
        }
      };

      // Logic for the CALLER
      if (idToCall) {
        peerConnection.createOffer()
          .then(offer => peerConnection.setLocalDescription(offer))
          .then(() => {
            socket.emit('call-user', {
              userToCall: idToCall,
              signal: peerConnection.localDescription,
              from: me,
              name: name || 'Unknown',
            });
          })
          .catch(err => console.error("Error creating offer:", err));
      }

      // Logic for the RECEIVER
      if (receivingCall && callerSignal) {
        peerConnection.setRemoteDescription(new RTCSessionDescription(callerSignal))
          .then(() => peerConnection.createAnswer())
          .then(answer => peerConnection.setLocalDescription(answer))
          .then(() => {
            socket.emit('answer-call', { signal: peerConnection.localDescription, to: caller });
            dispatch(setCallAccepted(true));
          })
          .catch(err => console.error("Error creating answer:", err));
      }
    }

    // Cleanup
    return () => {
      if (connectionRef.current) {
        connectionRef.current.close();
        connectionRef.current = null;
      }
    };
  }, [idToCall, receivingCall, callerSignal, stream, socket, dispatch]);


  // Effect for Caller: Listen for the answer from the receiver
  useEffect(() => {
    if (connectionRef.current && answerSignal && !connectionRef.current.currentRemoteDescription) {
        connectionRef.current.setRemoteDescription(new RTCSessionDescription(answerSignal))
          .catch(err => console.error("Error setting remote description from answer:", err));
    }
  }, [answerSignal]);


  // Effect to add queued ICE candidates
  useEffect(() => {
    if (connectionRef.current && iceCandidates.length > 0) {
      iceCandidates.forEach(candidate => {
        connectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
          .catch(err => console.error("Error adding ICE candidate:", err));
      });
      dispatch(clearIceCandidates());
    }
  }, [iceCandidates, dispatch]);


  // Attach local stream to the video element
  useEffect(() => {
    if (stream && myVideo.current) {
      myVideo.current.srcObject = stream;
    }
  }, [stream]);


  const answerCall = () => {
    // This now primarily just sets the state to trigger the main useEffect
    dispatch(setCallAccepted(true));
  };

  const leaveCall = () => {
    dispatch(setCallEnded(true));
    const remoteUser = caller || idToCall;
    if (remoteUser) {
      socket.emit('end-call', { to: remoteUser });
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    dispatch(resetCallState());
  };

  const declineCall = () => {
    const remoteUser = caller;
    if (remoteUser) {
        socket.emit('end-call', { to: remoteUser });
    }
    dispatch(resetCallState());
  }

  const cancelCall = () => {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    dispatch(resetCallState());
  }

  const toggleAudio = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
      setIsAudioMuted(prev => !prev);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
      setIsVideoMuted(prev => !prev);
    }
  };

  return (
    <>
      {/* Incoming call modal */}
      {receivingCall && !callAccepted && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-4">{name || 'Someone'} is calling...</h3>
            <div className="flex space-x-4">
              <button onClick={answerCall} className="bg-green-500 text-white px-4 py-2 rounded">Answer</button>
              <button onClick={declineCall} className="bg-red-500 text-white px-4 py-2 rounded">Decline</button>
            </div>
          </div>
        </div>
      )}

      {/* Outgoing call modal */}
      {idToCall && !callAccepted && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Calling {name || '...'}</h3>
            <p className="text-gray-600 mb-4">Waiting for response...</p>
            <button onClick={cancelCall} className="bg-red-500 text-white px-4 py-2 rounded">Cancel</button>
          </div>
        </div>
      )}

      {/* Active call modal */}
      {callAccepted && !callEnded && (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
          <div className="relative w-full h-full">
            {/* Remote Video */}
            <video playsInline ref={userVideo} autoPlay className="w-full h-full object-cover" />
            
            {/* Local Video */}
            <video playsInline muted ref={myVideo} autoPlay className="absolute top-4 right-4 w-1/4 h-1/4 border-2 border-white" />

            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
              <button onClick={toggleAudio} className={`px-6 py-3 rounded-full ${isAudioMuted ? 'bg-gray-500' : 'bg-blue-500'} text-white`}>
                {isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
              </button>
              <button onClick={toggleVideo} className={`px-6 py-3 rounded-full ${isVideoMuted ? 'bg-gray-500' : 'bg-blue-500'} text-white`}>
                {isVideoMuted ? 'Unmute Video' : 'Mute Video'}
              </button>
              <button onClick={leaveCall} className="bg-red-500 text-white px-6 py-3 rounded-full">Hang Up</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CallModal;
