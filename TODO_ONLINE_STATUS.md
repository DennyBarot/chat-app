# Online/Offline Status & Last Seen Implementation

## Steps to Complete:

### Phase 1: Database & Model Updates
- [ ] Update User model to add `isOnline` and `lastSeen` fields
- [ ] Create database migration if needed

### Phase 2: Server-Side Implementation
- [ ] Update socket.js to handle user connection/disconnection with status updates
- [ ] Add user status update functionality in user controller
- [ ] Implement last seen timestamp updates

### Phase 3: Client-Side Implementation
- [ ] Update user slice to track online status
- [ ] Modify SocketContext to handle status events
- [ ] Update UI components to display status indicators

### Phase 4: Testing
- [ ] Test online/offline functionality
- [ ] Verify last seen timestamps
- [ ] Test real-time updates across multiple clients

## Files to Modify:
- server/models/userModel.js
- server/socket/socket.js
- server/controllers/user.controller.js
- client/src/store/slice/user/user.slice.js
- client/src/context/SocketContext.jsx
- client/src/pages/home/User.jsx
- client/src/pages/home/UserSidebar.jsx
