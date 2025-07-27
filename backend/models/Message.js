import mongoose from "mongoose"

console.log("📋 Loading Message model...")

const messageSchema = new mongoose.Schema(
  {
    content: { type: String, required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: "ChatRoom", required: true },
    type: {
      type: String,
      enum: ["text", "code", "image", "file", "system"],
      default: "text",
    },
    language: String, // For code messages
    isEdited: { type: Boolean, default: false },
    editedAt: Date,
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    reactions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: String,
      },
    ],
    readBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        readAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
)

console.log("✅ Message model schema defined")

export default mongoose.model("Message", messageSchema)
