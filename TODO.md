# Call Debugging TODO

## Issue: Call UI closes after 3-4 seconds without acceptance

### Debugging Steps Completed:
- [x] Added logging to SocketContext.jsx for call-accepted event
- [x] Added logging to CallModal.jsx for callUser function
- [x] Added logging to CallModal.jsx for answerCall function
- [x] Added logging to CallModal.jsx for peer connection state changes
- [x] Added logging to CallModal.jsx for auto-call effect
- [x] Added logging to CallModal.jsx for callEnded effect
- [x] Added server-side logging for call signaling events

### Next Steps:
- [ ] Test the call functionality with track state logging and timeout
- [ ] Check if media tracks are in correct state (enabled, live, not muted)
- [ ] Check if createOffer times out or succeeds
- [ ] Check browser console logs for detailed error information
- [ ] Check server console logs for call signaling events
- [ ] Identify if call-accepted event is received
- [ ] Check if peer connection is failing
- [ ] Verify if callEnded is being set prematurely

### Potential Issues to Check:
1. Socket connection stability
2. Peer connection establishment
3. ICE candidate exchange
4. Remote description setting
5. Call acceptance signaling

### Expected Log Flow for Successful Call:
1. Client: "Emitting call-user to: [userId]"
2. Server: "Call initiated from [from] to [to]" + "Emitting call-user to room: [to]"
3. Client (callee): "Received incoming call: [data]"
4. Client (callee): "Emitting answer-call to: [caller]"
5. Server: "Call answered by [userId] to [to]" + "Emitting call-accepted to room: [to]"
6. Client (caller): "Call was accepted: [data]" + "Dispatching call accepted and setting answer signal"
7. Peer connection state: "connected"
