import dotenv from 'dotenv';
import dbConnect from './db/index.js';
import { app } from './app.js';
// require("dotenv").config({path: './env'})        // method 2

dotenv.config({
    path : './env'
});

dbConnect()
.then(()=>{

    app.on('error', (err)=> {       // additional
        console.error(err);
        throw err
    })

    app.listen( process.env.PORT || 8000 , ()=> {
        console.log(`Server is running on port ${process.env.PORT}`)
    })
})
.catch((error)=>{
    console.error("\nMongoDB connection Failed", error);
})

