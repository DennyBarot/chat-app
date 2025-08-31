# TODO for Fixing Call Re-initiation Issue After Hang Up

- [x] Verify and fix resetting of callEnded flag in Redux state after hang up.
- [x] Verify and fix resetting of callEndedRef in CallModal component after hang up.
- [x] Ensure peer connection is properly closed and recreated on new call.
- [x] Ensure media streams are properly stopped and reacquired on new call.
- [x] Confirm signaling events allow new calls after hang up.
- [x] Add debug logs in CallModal lifecycle methods to trace call state transitions.
- [ ] Test call flow: start call, hang up, start call again.
- [ ] Fix any discovered issues preventing new call after hang up.
