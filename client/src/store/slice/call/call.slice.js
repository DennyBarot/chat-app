import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  callAccepted: false,
  callEnded: false,
  stream: null,
  name: "",
  me: "",
  remoteStream: null,
  receivingCall: false,
  caller: "",
  callerSignal: null,
  idToCall: "",
  answerSignal: null,
  iceCandidates: [],
};

const callSlice = createSlice({
  name: "call",
  initialState,
  reducers: {
    setStream: (state, action) => {
      state.stream = action.payload;
    },
    setMe: (state, action) => {
      state.me = action.payload;
    },

    setCallAccepted: (state, action) => {
      state.callAccepted = action.payload;
    },
    setCallEnded: (state, action) => {
      state.callEnded = action.payload;
    },
    setReceivingCall: (state, action) => {
      state.receivingCall = action.payload;
    },
    setCaller: (state, action) => {
      state.caller = action.payload;
    },
    setCallerSignal: (state, action) => {
      state.callerSignal = action.payload;
    },
    setName: (state, action) => {
      state.name = action.payload;
    },
    setIdToCall: (state, action) => {
      state.idToCall = action.payload;
    },
    setRemoteStream: (state, action) => {
      state.remoteStream = action.payload;
    },
    setAnswerSignal: (state, action) => {
      state.answerSignal = action.payload;
    },
    addIceCandidate: (state, action) => {
      state.iceCandidates.push(action.payload);
    },
    clearIceCandidates: (state) => {
      state.iceCandidates = [];
    },
    resetCallState: (state) => {
      console.log('Resetting call state in Redux...');
      // Reset to initial state completely
      Object.assign(state, initialState);
      console.log('Call state reset completed');
    },
  },
});

export const {
  setStream,
  setMe,
  setCallAccepted,
  setCallEnded,
  setReceivingCall,
  setCaller,
  setCallerSignal,
  setName,
  setIdToCall,
  setRemoteStream,
  setAnswerSignal,
  addIceCandidate,
  clearIceCandidates,
  resetCallState,
} = callSlice.actions;

export default callSlice.reducer;