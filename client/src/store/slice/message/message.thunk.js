import { createAsyncThunk } from "@reduxjs/toolkit";
import { axiosInstance } from "../../../components/utilities/axiosInstance";

export const getConversationsThunk = createAsyncThunk(
    "message/getConversations",
    async (_, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get("/api/v1/message/get-conversations");
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response.data);
        }
    }
);

export const getMessagesThunk = createAsyncThunk(
    "message/getMessages",
    async (otherParticipantId, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get(`/api/v1/message/get-messages/${otherParticipantId}`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response.data);
        }
    }
);

export const sendMessageThunk = createAsyncThunk(
    "message/sendMessage",
    async ({ receiverId, message }, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.post(
                `/api/v1/message/send/${receiverId}`,
                { message }
            );
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response.data);
        }
    }
);

export const markMessagesReadThunk = createAsyncThunk(
    "message/markMessagesRead",
    async ({ conversationId }, { rejectWithValue }) => {
        try {
            await axiosInstance.put(`/api/v1/message/mark-read/${conversationId}`);
            return { conversationId };
        } catch (error) {
            return rejectWithValue(error.response.data);
        }
    }
);
