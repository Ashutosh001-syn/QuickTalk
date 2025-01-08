const mongoose = require('mongoose');



const userSchema = new mongoose.Schema({
    name:{ 
    type: String,
    require : [true, "Provide Name"]
    },
        email:{ 
           type: String,
           require : [true, "Provide Email"],
           unique: true
        },
        password:{ 
            type: String,
            require : [true, "Provide Password"]
            },
        profile_pic:{ 
            type: String,
            default : ""
            }

},{
    timestamps : true
});

const UserModel = mongoose.model('User',userSchema)

 module.exports = UserModel