import React, { useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  setCallAccepted,
  setCallEnded,
  setReceivingCall,
  setCaller,
  setCallerSignal,
  setStream,
  setRemoteStream,
  setIdToCall,
  clearIceCandidates,
  resetCallState
} from '../store/slice/call/call.slice';
import { useSocket } from '../context/SocketContext';

const CallModal = () => {
  const dispatch = useDispatch();
  const socket = useSocket();
  const callState = useSelector((state) => state.callReducer) || {};
  const {
    callAccepted = false,
    callEnded = false,
    stream = null,
    receivingCall = false,
    caller = "",
    callerSignal = null,
    me = "",
    idToCall = "",
    name = ""
  } = callState;

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();
  // FIX: Ref to store the ID of the user we are calling
  const idToCallRef = useRef();

  // Note: Socket event listeners are now handled in SocketContext to avoid conflicts
  // The CallModal focuses only on UI and peer connection management

  useEffect(() => {
    const handleCall = async () => {
      if (idToCall && !stream) {
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          dispatch(setStream(mediaStream));
          if (myVideo.current) {
            myVideo.current.srcObject = mediaStream;
          }
        } catch (error) {
          console.error('Error accessing media devices:', error);
          alert('Unable to access camera and microphone. Please check permissions.');
          dispatch(setIdToCall(""));
        }
      } else if (idToCall && stream && socket?.connected) {
        idToCallRef.current = idToCall;
        callUser(idToCall);
        dispatch(setIdToCall(""));
      }
    };
    handleCall();
  }, [idToCall, stream, socket, dispatch]);

  useEffect(() => {
    if (connectionRef.current && callState.answerSignal) {
      connectionRef.current.setRemoteDescription(new RTCSessionDescription(callState.answerSignal))
        .catch(error => console.error('Error setting remote description:', error));
    }
  }, [callState.answerSignal]);

  useEffect(() => {
    if (connectionRef.current && callState.iceCandidates.length > 0) {
      callState.iceCandidates.forEach(candidate => {
        connectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
          .catch(error => console.error('Error adding ICE candidate:', error));
      });
      dispatch(clearIceCandidates());
    }
  }, [callState.iceCandidates, dispatch]);

  // Handle remote stream updates
  useEffect(() => {
    console.log('Remote stream useEffect triggered:', {
      hasRemoteStream: !!callState.remoteStream,
      hasUserVideo: !!userVideo.current,
      remoteStreamTracks: callState.remoteStream?.getTracks()?.length || 0
    });

    if (callState.remoteStream && userVideo.current) {
      console.log('Setting remote stream to userVideo element');
      console.log('Remote stream tracks:', callState.remoteStream.getTracks());
      userVideo.current.srcObject = callState.remoteStream;
      console.log('Remote stream attached to userVideo element successfully');
    } else if (callState.remoteStream && !userVideo.current) {
      console.warn('Remote stream available but userVideo element not found');
    }
  }, [callState.remoteStream]);

  // Handle local stream attachment when call is accepted and video elements are rendered
  useEffect(() => {
    if (callAccepted && !callEnded && stream && myVideo.current) {
      console.log('Attaching local stream to myVideo element after call acceptance');
      myVideo.current.srcObject = stream;
    }
  }, [callAccepted, callEnded, stream]);

  const callUser = (id) => {
    if (!socket || !stream) return;

    try {
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
        ],
      });

      stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', { to: id, candidate: event.candidate });
        }
      };

      peerConnection.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          dispatch(setRemoteStream(event.streams[0]));
        }
      };

      peerConnection.createOffer()
        .then(offer => peerConnection.setLocalDescription(offer))
        .then(() => {
          socket.emit('call-user', {
            userToCall: id,
            signalData: peerConnection.localDescription,
            from: me,
            name: name || 'Unknown',
          });
        })
        .catch(error => console.error('Error creating offer:', error));

      connectionRef.current = peerConnection;
    } catch (error) {
      console.error('Error creating RTCPeerConnection:', error);
      dispatch(setIdToCall(""));
    }
  };

  const answerCall = async () => {
    if (!socket || !caller || !callerSignal) return;

    try {
      let mediaStream = stream;
      if (!mediaStream) {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        dispatch(setStream(mediaStream));
      }

      dispatch(setCallAccepted(true));

      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
        ],
      });

      mediaStream.getTracks().forEach(track => peerConnection.addTrack(track, mediaStream));

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', { to: caller, candidate: event.candidate });
        }
      };

      peerConnection.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          dispatch(setRemoteStream(event.streams[0]));
        }
      };

      await peerConnection.setRemoteDescription(new RTCSessionDescription(callerSignal));

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socket.emit('answer-call', { signal: peerConnection.localDescription, to: caller });

      connectionRef.current = peerConnection;
    } catch (error) {
      console.error('Error answering call:', error);
      dispatch(resetCallState());
    }
  };

  
  const leaveCall = () => {
    dispatch(setCallEnded(true));

    if (connectionRef.current) {
      connectionRef.current.getSenders().forEach(sender => sender.track?.stop());
      connectionRef.current.close();
      connectionRef.current = null;
    }

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      dispatch(setStream(null));
    }

    const remoteUser = caller || idToCallRef.current;
    if (socket?.connected && remoteUser) {
      socket.emit('end-call', { to: remoteUser });
    }

    dispatch(resetCallState());
    idToCallRef.current = null;
  };

  return (
    <>
      {/* Incoming call modal */}
      {receivingCall && !callAccepted && caller && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-4">{caller} is calling...</h3>
            <div className="flex space-x-4">
              <button
                onClick={answerCall}
                className="bg-green-500 text-white px-4 py-2 rounded"
              >
                Answer
              </button>
              <button
                onClick={() => dispatch(setReceivingCall(false))}
                className="bg-red-500 text-white px-4 py-2 rounded"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Outgoing call modal - when initiating a call */}
      {idToCall && !receivingCall && !callAccepted && !callEnded && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Calling...</h3>
            <p className="text-gray-600 mb-4">Waiting for response...</p>
            <button
              onClick={() => {
                dispatch(setIdToCall(""));
                if (stream) {
                  stream.getTracks().forEach(track => track.stop());
                  dispatch(setStream(null));
                }
              }}
              className="bg-red-500 text-white px-4 py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Active call modal */}
      {callAccepted && !callEnded && (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
          <div className="relative w-full h-full">
            <video
              playsInline
              muted
              ref={myVideo}
              autoPlay
              className="absolute top-4 right-4 w-1/4 h-1/4 border-2 border-white"
            />
            <video
              playsInline
              ref={userVideo}
              autoPlay
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
              <button
                onClick={leaveCall}
                className="bg-red-500 text-white px-6 py-3 rounded-full"
              >
                Hang Up
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CallModal;