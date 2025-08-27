import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
    {
    participants: [
       {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
       }
    ],
    
    messages: [
        { 
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
        }
    ],
},
    { timestamps: true })

// Add an index on the participants field for faster conversation lookups
conversationSchema.index({ participants: 1 });

export default mongoose.model("Conversation", conversationSchema);