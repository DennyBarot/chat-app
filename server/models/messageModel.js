import mongoose from "mongoose";

const { Schema, model } = mongoose;

const messageSchema = new Schema(
  {
  content: { type: String, required: true }, // message text
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: Schema.Types.ObjectId, ref: 'User' }, // optional for one-to-one
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation' }, // for group/one-to-one
  
  replyTo: { type: Schema.Types.ObjectId, ref: 'Message', default: null },
  quotedContent: { type: String },
  readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  
  // Audio message fields
  audioUrl: { type: String }, // URL to the stored audio file
  audioDuration: { type: Number }, // Duration of the audio in seconds
  isAudioMessage: { type: Boolean, default: false }, // Flag to identify audio messages
  },
  { timestamps: true }
);

export default model("Message", messageSchema);