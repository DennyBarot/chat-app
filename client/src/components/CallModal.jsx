import React, { useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { closeCallModal, toggleMute, toggleCamera, setOngoingCall } from '../store/slice/call/call.slice';
import { useSocket } from '../context/SocketContext';
 
const CallModal = () => {
  const dispatch = useDispatch();
  const { acceptCall, endCall } = useSocket();
  const { isCallModalOpen, incomingCall, ongoingCall, localStream, remoteStream, isMuted, isCameraOff, callType } = useSelector(state => state.callReducer);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleAcceptCall = () => {
    if (socket && incomingCall) {
      socket.emit('call-accepted', { callerId: incomingCall.callerId, answer: 'accepted' });
      dispatch(setOngoingCall(incomingCall));
    }
  };

  const handleRejectCall = () => {
    if (socket && incomingCall) {
      socket.emit('end-call', { receiverId: incomingCall.callerId });
    }
    dispatch(closeCallModal());
  };

  const handleEndCall = () => {
    if (socket && ongoingCall) {
      socket.emit('end-call', { receiverId: ongoingCall._id });
    }
    dispatch(closeCallModal());
  };

  const handleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
    }
    dispatch(toggleMute());
  };

  const handleCameraToggle = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
    }
    dispatch(toggleCamera());
  };

  if (!isCallModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        {incomingCall ? (
          <div className="text-center">
            <h2 className="text-xl font-bold mb-4">Incoming Call</h2>
            <p className="mb-4">Call from {incomingCall.callerName}</p>
            <div className="flex justify-center space-x-4">
              <button onClick={handleAcceptCall} className="bg-green-500 text-white px-4 py-2 rounded">Accept</button>
              <button onClick={handleRejectCall} className="bg-red-500 text-white px-4 py-2 rounded">Reject</button>
            </div>
          </div>
        ) : ongoingCall ? (
          <div className="text-center">
            <h2 className="text-xl font-bold mb-4">Ongoing Call</h2>
            <p className="mb-4">With {ongoingCall.fullName}</p>
            {callType === 'video' && (
              <div className="mb-4">
                <video ref={localVideoRef} autoPlay muted className="w-32 h-24 bg-black rounded"></video>
                <video ref={remoteVideoRef} autoPlay className="w-full h-48 bg-black rounded mt-2"></video>
              </div>
            )}
            <div className="flex justify-center space-x-4">
              <button onClick={handleMute} className={`px-4 py-2 rounded ${isMuted ? 'bg-gray-500' : 'bg-blue-500'} text-white`}>
                {isMuted ? 'Unmute' : 'Mute'}
              </button>
              {callType === 'video' && (
                <button onClick={handleCameraToggle} className={`px-4 py-2 rounded ${isCameraOff ? 'bg-gray-500' : 'bg-blue-500'} text-white`}>
                  {isCameraOff ? 'Turn On Camera' : 'Turn Off Camera'}
                </button>
              )}
              <button onClick={handleEndCall} className="bg-red-500 text-white px-4 py-2 rounded">End Call</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CallModal;
