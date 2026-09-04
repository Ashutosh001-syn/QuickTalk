const mongoose =require('mongoose');

const messageSchema = new mongoose.Schema({
    text : {
        type : String,
        default : ""
    },
    imageUrl: {
        type : String,
        default : ""
    },
    videoUrl: {
        type : String,
        default : ""
    },
    seen :{
        type : Boolean,
        default : false
    },
    deleted: {
        type: Boolean,
        default: false
    },
    msgByUserId : {
        type : mongoose.Schema.ObjectId,
        required : true,
        ref : 'User'
    },
    replyTo : {
        text: { type: String, default: "" },
        imageUrl: { type: String, default: "" },
        videoUrl: { type: String, default: "" },
        msgByUserId: { type: mongoose.Schema.ObjectId, ref: 'User' }
    }
},{
    timestamps : true
})

const conversationSchema =new mongoose.Schema({
    sender : {
        type : mongoose.Schema.ObjectId,
        required : true,
        ref : 'User'
    },
    receiver : {
        type : mongoose.Schema.ObjectId,
        required : true,
        ref : 'User'
    },
    messages : [{
    type : mongoose.Schema.ObjectId,
    ref : 'Message'
}]
},{
    timestamps : true
})



const MessageModel = mongoose.model('Message', messageSchema)
const conversationModel = mongoose.model('Conversation', conversationSchema)

module.exports ={
    MessageModel,
    conversationModel
}