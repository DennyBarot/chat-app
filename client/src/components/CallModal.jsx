
import React from 'react';

const CallModal = ({ call, callAccepted, myVideo, userVideo, stream, answerCall, leaveCall, callEnded }) => {
  return (
    <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-4xl w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Video Call</h2>
          <button onClick={leaveCall} className="text-red-500 hover:text-red-700">
            End Call
          </button>
        </div>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-1/2 relative">
            {stream && <video playsInline muted ref={myVideo} autoPlay className="w-full h-auto rounded-lg" />}
          </div>
          <div className="w-full md:w-1/2 relative">
            {callAccepted && !callEnded ? (
              <video playsInline ref={userVideo} autoPlay className="w-full h-auto rounded-lg" />
            ) : null}
          </div>
        </div>
        <div className="mt-4">
          {call.isReceivingCall && !callAccepted && (
            <div className="flex items-center justify-center">
              <h1 className="text-xl mr-4">{call.name} is calling:</h1>
              <button onClick={answerCall} className="bg-green-500 text-white px-4 py-2 rounded-lg">
                Answer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallModal;
