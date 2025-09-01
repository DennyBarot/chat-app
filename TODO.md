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
- [x] Test the call functionality with track state logging and timeout
- [x] Check if media tracks are in correct state (enabled, live, not muted)
- [x] Check if createOffer times out or succeeds
- [x] Check browser console logs for detailed error information
- [ ] Test the fallback createOffer mechanism
- [ ] Check server console logs for call signaling events
- [ ] Identify if call-accepted event is received
- [ ] Check if peer connection is failing
- [ ] Verify if callEnded is being set prematurely

### Root Cause Identified:
- createOffer() is hanging indefinitely (timeout after 10 seconds)
- Media tracks are in correct state (enabled=true, readyState=live, muted=false)
- Peer connection is created successfully
- Issue is with WebRTC createOffer implementation in the browser/environment

### Fix Applied:
- Added fallback mechanism to try createOffer without offerToReceiveAudio/Video options
- Reduced timeout to 5 seconds for faster failure detection

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
