import mongoose from 'mongoose';
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
    username : {
        type: String, 
        required: true,
        unique : true, 
        lowercase: true,
        trim : true, 
        index : true                //! indexing - username
    },
    email : {
        type: String, 
        required: true,
        unique : true, 
        lowercase: true,
        trim : true, 
    },
    fullname : {
        type: String, 
        required: true,
        trim : true,
        index : true
    },
    avatar : {
        type : String,          //* Cloudinary URL
        required : true
    },
    coverImage : {
        type : String,     
    },
    password : {
        type : String,
        required : [true, "Password is required"]
    },
    refreshToken : {
        type : String,
        required : true
    },
    watchHistory : [            //* array of obj - passing videoID
        {
            type : mongoose.Schema.Types.ObjectId,
            ref : 'Video'
        }
    ]
} , {
    timestamps : true
})

        //* Middleware - 'PRE' : just before "save" event
userSchema.pre("save", async function (next) {
    if (!this.isModified("password"))           //* only hash iif "password" filed is updated
        return next();
    
    this.password = await bcrypt.hash(this.password , 10)         //* 10 rounds of hashing
    next()
})   

        //* Methods
userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)
}

        //* less secure (not stored in DB), short TIME ... but holds moreINFO
userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id : this._id,
            email : this.email,
            username : this.username,
            fullname : this.fullname
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn : process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id : this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn : process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User", userSchema);