import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  call: null, // { type, from, to, offer, answer, status }
  incomingCall: null,
  outgoingCall: null,
  iceCandidate: null,
  callRejected: null,
};

const callSlice = createSlice({
  name: "call",
  initialState,
  reducers: {
    setCall: (state, action) => {
      state.call = { ...state.call, ...action.payload };
    },
    setIncomingCall: (state, action) => {
      state.incomingCall = action.payload;
      state.outgoingCall = null;
    },
    setOutgoingCall: (state, action) => {
      state.outgoingCall = action.payload;
      state.incomingCall = null;
    },
    setIceCandidate: (state, action) => {
      state.iceCandidate = action.payload;
    },
    setCallRejected: (state, action) => {
      state.callRejected = action.payload;
      state.call = null;
      state.incomingCall = null;
      state.outgoingCall = null;
    },
    clearCallState: (state) => {
      state.call = null;
      state.incomingCall = null;
      state.outgoingCall = null;
      state.iceCandidate = null;
      state.callRejected = null;
    },
  },
});

export const {
  setCall,
  setIncomingCall,
  setOutgoingCall,
  setIceCandidate,
  setCallRejected,
  clearCallState,
} = callSlice.actions;

export default callSlice.reducer;
