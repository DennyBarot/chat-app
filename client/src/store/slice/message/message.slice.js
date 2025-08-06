import { createSlice } from "@reduxjs/toolkit";
import { getConversationsThunk, getMessagesThunk, markMessagesReadThunk, sendMessageThunk } from "./message.thunk";

const initialState = {
    loading: false,
    error: null,
    conversations: [],
    messages: [],
};

const messageSlice = createSlice({
    name: "message",
    initialState,
    reducers: {
        updateConversation: (state, action) => {
            const newMessage = action.payload;
            const conversation = state.conversations.find(
                (conv) => conv._id === newMessage.conversationId
            );
            if (conversation) {
                conversation.messages.unshift(newMessage);
                conversation.updatedAt = newMessage.createdAt;
            }
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(getConversationsThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getConversationsThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.conversations = action.payload;
            })
            .addCase(getConversationsThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(getMessagesThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getMessagesThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.messages = action.payload;
            })
            .addCase(getMessagesThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(sendMessageThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(sendMessageThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.messages.push(action.payload);
            })
            .addCase(sendMessageThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(markMessagesReadThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(markMessagesReadThunk.fulfilled, (state, action) => {
                state.loading = false;
                const { conversationId } = action.payload;
                const conversation = state.conversations.find(
                    (conv) => conv._id === conversationId
                );
                if (conversation) {
                    conversation.unreadCount = 0;
                }
            })
            .addCase(markMessagesReadThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { updateConversation } = messageSlice.actions;
export default messageSlice.reducer;