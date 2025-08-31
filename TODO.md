# Audio/Video Call Feature Implementation TODO

## Completed
- [x] Analyze project structure and gather information
- [x] Create comprehensive plan
- [x] Get user approval for plan
- [x] Install simple-peer dependency in client
- [x] Update server/socket/socket.js for call signaling events
- [x] Create client/src/store/slice/call/call.slice.js
- [x] Create client/src/components/CallModal.jsx
- [x] Update client/src/context/SocketContext.jsx
- [x] Update client/src/store/store.js to include call slice
- [x] Update client/src/pages/home/MessageContainer.jsx to add call button
- [x] Fix null socket errors in CallModal.jsx
- [x] Fix null userProfile.name error in call button
- [x] Add Redux Provider to App.jsx to connect store
- [x] Add null checks to call button in MessageContainer.jsx
- [x] Add debugging logs to call button and CallModal
- [x] Disable call button while userProfile is loading
- [x] Remove console spam from debugging logs
- [x] Fix Redux Provider context issue for userProfile loading

## Pending
- [ ] Test call functionality
- [ ] Add error handling for permissions/network issues
- [ ] Optional: Integrate STUN/TURN server
