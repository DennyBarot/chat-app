import mongoose from "mongoose";

/**
 * Conversation schema for real-time chat.
 * Each conversation represents a private chat between two users.
 * @type {mongoose.Schema}
 */
const conversationSchema = new mongoose.Schema(
  {
    /**
     * Array of participating user IDs. For 1:1 chat, length should always be 2.
     * Indexed for fast lookup.
     */
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
    ],
    /**
     * Array of message IDs (references to Message collection).
     * Keep as references to avoid the BSON 16MB limit for large chats.
     */
    messages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
      },
    ],
  },
  { timestamps: true } // createdAt, updatedAt
);

// Ensure participants are unique per conversation
conversationSchema.index({ participants: 1 }, { unique: true });



export default mongoose.model("Conversation", conversationSchema);
