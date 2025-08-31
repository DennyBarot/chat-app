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
      state.callAccepted = false;
      state.callEnded = false;
      state.stream = null;
      state.remoteStream = null;
      state.receivingCall = false;
      state.caller = "";
      state.callerSignal = null;
      state.idToCall = "";
      state.answerSignal = null;
      state.iceCandidates = [];
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
