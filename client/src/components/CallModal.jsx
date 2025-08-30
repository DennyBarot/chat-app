import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSocket } from '../context/SocketContext';
import {
  clearCallState,
  setCall,
  setCallRejected,
  setIceCandidate,
  setIncomingCall,
  setOutgoingCall,
} from '../store/slice/call/call.slice';

const CallModal = () => {
  const dispatch = useDispatch();
  const socket = useSocket();
  const { userProfile } = useSelector((state) => state.userReducer);
  const { incomingCall, outgoingCall, call, iceCandidate, callRejected } = useSelector((state) => state.callReducer);

  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerConnectionRef = useRef();
  const [localStream, setLocalStream] = useState(null);

  const createPeerConnection = async (remoteUserId) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        {
          urls: 'stun:stun.l.google.com:19302',
        },
      ],
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

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    setLocalStream(stream);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    return pc;
  };

  useEffect(() => {
    if (outgoingCall && !call) {
      const startCall = async () => {
        peerConnectionRef.current = await createPeerConnection(outgoingCall.to);
        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);
        socket.emit('call-user', { to: outgoingCall.to, offer });
        dispatch(setCall({ to: outgoingCall.to, type: 'outgoing' }));
      };
      startCall();
    }
  }, [outgoingCall, call, dispatch, socket]);

  useEffect(() => {
    if (incomingCall && !call) {
      // Just show the incoming call UI
    }
  }, [incomingCall, call]);

  useEffect(() => {
    if (call && call.answer && peerConnectionRef.current.signalingState !== 'stable') {
      peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(call.answer));
    }
  }, [call]);

  useEffect(() => {
    if (iceCandidate && peerConnectionRef.current) {
      peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(iceCandidate.candidate));
      dispatch(setIceCandidate(null));
    }
  }, [iceCandidate, dispatch]);

  useEffect(() => {
    if (callRejected) {
      handleHangup();
    }
  }, [callRejected]);

  const handleAnswer = async () => {
    peerConnectionRef.current = await createPeerConnection(incomingCall.from._id);
    await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
    const answer = await peerConnectionRef.current.createAnswer();
    await peerConnectionRef.current.setLocalDescription(answer);
    socket.emit('make-answer', { to: incomingCall.from._id, answer });
    dispatch(setCall({ from: incomingCall.from, type: 'incoming', status: 'active' }));
    dispatch(setIncomingCall(null));
  };

  const handleReject = () => {
    socket.emit('call-rejected', { to: incomingCall.from._id });
    dispatch(clearCallState());
  };

  const handleHangup = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    if (call) {
      socket.emit('call-rejected', { to: call.from?._id || call.to });
    }
    dispatch(clearCallState());
  };

  if (!incomingCall && !call) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 text-white rounded-lg p-8 shadow-lg w-full max-w-md mx-auto">
        {incomingCall && !call && (
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
        {call && (
          <div>
            <div className="relative mb-4">
              <video ref={remoteVideoRef} autoPlay className="w-full h-64 bg-black rounded-lg" />
              <video ref={localVideoRef} autoPlay muted className="absolute bottom-4 right-4 w-32 h-24 bg-gray-900 rounded-lg border-2 border-white" />
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
