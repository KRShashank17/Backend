import mongoose, {Schema} from "mongoose"

const subscriptionSchema = new Schema({
    subscriber : {                                  // who is subscribing to my channel
        type : mongoose.Schema.Types.ObjectId,
        ref : "User"
    },
    channel : {                                     // To whom I am subscribing to
        type : mongoose.Schema.Types.ObjectId,
        ref : "User"
    }
})

export const Subscription = mongoose.model("Subscription" , subscriptionSchema)