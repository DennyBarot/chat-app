import React, { useRef, useEffect, useCallback } from 'react';
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
  setIdToCall,
  resetCallState,
} from '../store/slice/call/call.slice';
import { useSocket } from '../context/SocketContext';

const CallModal = () => {
  const dispatch = useDispatch();
  const socket = useSocket();
  const callState = useSelector((state) => state.callReducer) || {};
  const { userProfile } = useSelector((state) => state.userReducer);

  const {
    callAccepted,
    callEnded,
    stream,
    receivingCall,
    caller,
    callerSignal,
    me,
    idToCall,
  } = callState;

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();
  const idToCallRef = useRef();

  const setupPeer = useCallback((initiator, mediaStream) => {
    const peer = new Peer({
      initiator,
      trickle: false,
      stream: mediaStream,
    });

    peer.on('signal', (data) => {
      if (initiator) {
        socket.emit('call-user', {
          userToCall: idToCallRef.current,
          signalData: data,
          from: me,
          name: userProfile?.fullName || 'Unknown',
        });
      } else {
        socket.emit('answer-call', { signal: data, to: caller });
      }
    });

    peer.on('stream', (remoteStream) => {
      dispatch(setRemoteStream(remoteStream));
      if (userVideo.current) {
        userVideo.current.srcObject = remoteStream;
      }
    });

    peer.on('error', (err) => {
      console.error('Peer connection error:', err);
    });

    connectionRef.current = peer;
  }, [socket, me, caller, userProfile, dispatch]);

  useEffect(() => {
    if (idToCall && !callAccepted) {
      idToCallRef.current = idToCall;
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((mediaStream) => {
          dispatch(setStream(mediaStream));
          if (myVideo.current) {
            myVideo.current.srcObject = mediaStream;
          }
          setupPeer(true, mediaStream);
        })
        .catch((err) => {
          console.error('Failed to get media stream:', err);
        });
    }
  }, [idToCall, callAccepted, dispatch, setupPeer]);

  const answerCall = () => {
    dispatch(setCallAccepted(true));
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((mediaStream) => {
        dispatch(setStream(mediaStream));
        if (myVideo.current) {
          myVideo.current.srcObject = mediaStream;
        }
        setupPeer(false, mediaStream);
        if (callerSignal) {
          connectionRef.current.signal(callerSignal);
        }
      })
      .catch((err) => {
        console.error('Failed to get media stream for answering call:', err);
      });
  };

  const cleanup = useCallback(() => {
    if (connectionRef.current) {
      connectionRef.current.destroy();
      connectionRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    dispatch(resetCallState());
  }, [dispatch, stream]);

  const leaveCall = () => {
    const remoteUser = caller || idToCallRef.current;
    if (socket?.connected && remoteUser) {
      socket.emit('end-call', { to: remoteUser });
    }
    dispatch(setCallEnded(true));
  };

  useEffect(() => {
    if (callEnded) {
      cleanup();
    }
  }, [callEnded, cleanup]);

  return (
    <>
      {receivingCall && !callAccepted && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-4">{callState.name || caller} is calling...</h3>
            <div className="flex space-x-4">
              <button onClick={answerCall} className="bg-green-500 text-white px-4 py-2 rounded">
                Answer
              </button>
              <button onClick={() => {
                dispatch(setReceivingCall(false));
                leaveCall();
              }} className="bg-red-500 text-white px-4 py-2 rounded">
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {idToCall && !callAccepted && !callEnded && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Calling {callState.name}...</h3>
            <p className="text-gray-600 mb-4">Waiting for response...</p>
            <button onClick={leaveCall} className="bg-red-500 text-white px-4 py-2 rounded">
              Cancel
            </button>
          </div>
        </div>
      )}

      {callAccepted && !callEnded && (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
          <div className="relative w-full h-full">
            <video playsInline muted ref={myVideo} autoPlay controls className="absolute top-4 right-4 w-1/4 h-1/4 border-2 border-white" />
            <video playsInline ref={userVideo} autoPlay controls className="w-full h-full object-cover" />
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
              <button onClick={leaveCall} className="bg-red-500 text-white px-6 py-3 rounded-full">
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
