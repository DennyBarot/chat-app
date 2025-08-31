import React, { useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Peer from 'simple-peer';
import {
  setCallAccepted,
  setCallEnded,
  setReceivingCall,
  setCaller,
  setCallerSignal,
  setStream,
  setRemoteStream,
  setIdToCall
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

  // Set up socket listeners - only when socket is available
  useEffect(() => {
    if (!socket) return;

    const handleCallUser = (data) => {
      dispatch(setReceivingCall(true));
      dispatch(setCaller(data.from));
      dispatch(setCallerSignal(data.signal));
    };

    // FIX: Correctly handle call acceptance on the caller's side
    const handleCallAccepted = (signal) => {
      dispatch(setCallAccepted(true));
      // The caller's peer connection is already in connectionRef.
      // We just need to signal it with the answer from the callee.
      if (connectionRef.current && signal) {
        try {
          connectionRef.current.signal(signal);
        } catch (error) {
          console.error('Error signaling peer connection:', error);
        }
      }
    };

    const handleEndCall = () => {
      dispatch(setCallEnded(true));
      if (connectionRef.current) {
        connectionRef.current.destroy();
      }
      // Note: Reloading the page is a simple way to reset state,
      // but a more graceful state reset might be better in the long run.
      window.location.reload();
    };

    socket.on('call-user', handleCallUser);
    socket.on('call-accepted', handleCallAccepted);
    socket.on('end-call', handleEndCall);

    return () => {
      socket.off('call-user', handleCallUser);
      socket.off('call-accepted', handleCallAccepted);
      socket.off('end-call', handleEndCall);
    };
  }, [socket, dispatch]);

  // Handle initiating a call
  useEffect(() => {
    if (idToCall && !stream) {
      // Request media permissions when initiating a call
      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((mediaStream) => {
        dispatch(setStream(mediaStream));
        if (myVideo.current) {
          myVideo.current.srcObject = mediaStream;
        }
      }).catch((error) => {
        console.error('Error accessing media devices:', error);
        // Reset call state if media access fails
        dispatch(setIdToCall(""));
      });
    } else if (idToCall && stream) {
      // FIX: Store the ID of the user we are calling before resetting it in the store
      idToCallRef.current = idToCall;
      callUser(idToCall);
      dispatch(setIdToCall(null)); // Reset after calling to prevent re-triggering
    }
  }, [idToCall, stream, dispatch]);

  const callUser = (id) => {
    if (!socket || !stream) return;

    try {
      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream: stream,
        config: {
          iceServers: [
            {
              urls: 'stun:stun.l.google.com:19302',
            },
          ],
        },
      });

      peer.on('signal', (data) => {
        if (socket && socket.connected) {
          socket.emit('call-user', {
            userToCall: id,
            signalData: data,
            from: me,
            name: name || 'Unknown',
          });
        }
      });

      peer.on('stream', (remoteStream) => {
        dispatch(setRemoteStream(remoteStream));
        if (userVideo.current) {
          userVideo.current.srcObject = remoteStream;
        }
      });

      peer.on('error', (error) => {
        console.error('Peer connection error:', error);
      });

      connectionRef.current = peer;
    } catch (error) {
      console.error('Error creating peer connection:', error);
    }
  };

  const answerCall = () => {
    if (!socket || !caller || !callerSignal) return;

    // Request media permissions if we don't have a stream yet
    if (!stream) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((mediaStream) => {
        dispatch(setStream(mediaStream));
        if (myVideo.current) {
          myVideo.current.srcObject = mediaStream;
        }
        // Now create the peer connection with the stream
        createPeerConnection(mediaStream);
      }).catch((error) => {
        console.error('Error accessing media devices:', error);
        // Reset call state if media access fails
        dispatch(setReceivingCall(false));
        dispatch(setCaller(""));
        dispatch(setCallerSignal(null));
      });
    } else {
      // We already have a stream, create peer connection directly
      createPeerConnection(stream);
    }
  };

  const createPeerConnection = (mediaStream) => {
    dispatch(setCallAccepted(true));
    try {
      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream: mediaStream,
        config: {
          iceServers: [
            {
              urls: 'stun:stun.l.google.com:19302',
            },
          ],
        },
      });

      peer.on('signal', (data) => {
        if (socket && socket.connected) {
          socket.emit('answer-call', { signal: data, to: caller });
        }
      });

      peer.on('stream', (remoteStream) => {
        dispatch(setRemoteStream(remoteStream));
        if (userVideo.current) {
          userVideo.current.srcObject = remoteStream;
        }
      });

      peer.on('error', (error) => {
        console.error('Peer connection error:', error);
      });

      if (callerSignal) {
        peer.signal(callerSignal);
      }
      connectionRef.current = peer;
    } catch (error) {
      console.error('Error creating peer connection:', error);
    }
  };

  const leaveCall = () => {
    dispatch(setCallEnded(true));
    if (connectionRef.current) {
      connectionRef.current.destroy();
    }
    if (socket && socket.connected) {
      // FIX: Ensure we notify the correct user when ending the call
      const remoteUser = caller || idToCallRef.current;
      if (remoteUser) {
        socket.emit('end-call', { to: remoteUser });
      }
    }
    window.location.reload();
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