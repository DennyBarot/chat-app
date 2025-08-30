import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSocket } from '../context/SocketContext';
import {
  clearCallState,
  setCall,
  setIceCandidate,
  setIncomingCall,
} from '../store/slice/call/call.slice';

const CallModal = () => {
  const dispatch = useDispatch();
  const socket = useSocket();
  const { outgoingCall, incomingCall, call, iceCandidate, callRejected } = useSelector((state) => state.callReducer);

  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerConnectionRef = useRef();
  const [localStream, setLocalStream] = useState(null);
  const [pendingIceCandidates, setPendingIceCandidates] = useState([]);

  // Effect to handle queued ICE candidates
  useEffect(() => {
    if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription && pendingIceCandidates.length > 0) {
      pendingIceCandidates.forEach(candidate => {
        peerConnectionRef.current.addIceCandidate(candidate).catch(e => console.error("Error adding received ICE candidate", e));
      });
      setPendingIceCandidates([]);
    }
  }, [peerConnectionRef.current?.remoteDescription, pendingIceCandidates]);

  // Effect to process incoming ICE candidates from Redux
  useEffect(() => {
    if (iceCandidate && iceCandidate.candidate) {
      const candidate = new RTCIceCandidate(iceCandidate.candidate);
      if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
        peerConnectionRef.current.addIceCandidate(candidate).catch(e => console.error("Error adding received ICE candidate", e));
      } else {
        setPendingIceCandidates(prev => [...prev, candidate]);
      }
      dispatch(setIceCandidate(null)); // Clear the candidate from Redux
    }
  }, [iceCandidate, dispatch]);

  const createPeerConnection = async (remoteUserId) => {
    // Close any existing connection
    if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
    }

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { to: remoteUserId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
    } catch (error) {
      console.error("Error accessing media devices.", error);
      // Handle media access error (e.g., show a message to the user)
      handleHangup(); // End the call attempt if media is not available
    }
    
    peerConnectionRef.current = pc;
    return pc;
  };

  // Effect for outgoing calls
  useEffect(() => {
    if (outgoingCall && !call) {
      const startCall = async () => {
        const pc = await createPeerConnection(outgoingCall.to);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('call-user', { to: outgoingCall.to, offer });
        dispatch(setCall({ to: outgoingCall.to, type: 'outgoing' }));
      };
      startCall();
    }
  }, [outgoingCall, call, dispatch, socket]);

  // Effect to set the answer for the outgoing call
  useEffect(() => {
    if (call?.type === 'outgoing' && call.answer && peerConnectionRef.current?.signalingState === 'have-local-offer') {
      peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(call.answer));
    }
  }, [call]);

  // Effect for call rejection
  useEffect(() => {
    if (callRejected) {
      handleHangup();
    }
  }, [callRejected]);

  const handleAnswer = async () => {
    if (!incomingCall) return;
    const pc = await createPeerConnection(incomingCall.from._id);
    await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('make-answer', { to: incomingCall.from._id, answer });
    dispatch(setCall({ from: incomingCall.from, type: 'incoming', status: 'active' }));
    dispatch(setIncomingCall(null));
  };

  const handleReject = () => {
    if (!incomingCall) return;
    socket.emit('call-rejected', { to: incomingCall.from._id });
    dispatch(clearCallState());
  };

  const handleHangup = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    const remoteUserId = call?.from?._id || call?.to;
    if (remoteUserId) {
      socket.emit('call-rejected', { to: remoteUserId });
    }
    dispatch(clearCallState());
  };

  const isCallActive = call && call.status === 'active';
  const isRinging = incomingCall || (call && call.type === 'outgoing' && !call.status);

  if (!isRinging && !isCallActive) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 text-white rounded-lg p-8 shadow-lg w-full max-w-md mx-auto">
        {/* Incoming Call UI */}
        {incomingCall && !isCallActive && (
          <div className="text-center">
            <p className="text-2xl font-bold mb-2">Incoming Call</p>
            <div className="flex items-center justify-center mb-4">
              <img src={incomingCall.from.profilePic} alt={incomingCall.from.fullName} className="w-20 h-20 rounded-full mr-4" />
              <p className="text-xl">{incomingCall.from.fullName}</p>
            </div>
            <div className="flex justify-center space-x-4">
              <button onClick={handleAnswer} className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-full font-semibold transition-colors">Answer</button>
              <button onClick={handleReject} className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-full font-semibold transition-colors">Reject</button>
            </div>
          </div>
        )}

        {/* Outgoing Call UI */}
        {call && call.type === 'outgoing' && !isCallActive && (
            <div className="text-center">
                <p className="text-2xl font-bold mb-4">Calling...</p>
                {/* You can add the recipient's info here if you pass it */}
                <div className="flex justify-center">
                    <button onClick={handleHangup} className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-full font-bold text-lg transition-colors">Cancel</button>
                </div>
            </div>
        )}

        {/* Active Call UI */}
        {isCallActive && (
          <div>
            <div className="relative mb-4">
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-64 bg-black rounded-lg" />
              <video ref={localVideoRef} autoPlay muted playsInline className="absolute bottom-4 right-4 w-32 h-24 bg-gray-900 rounded-lg border-2 border-white" />
            </div>
            <div className="flex justify-center">
              <button onClick={handleHangup} className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-full font-bold text-lg transition-colors">Hang Up</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallModal;
