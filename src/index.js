import dotenv from 'dotenv';
import dbConnect from './db/index.js';
// require("dotenv").config({path: './env'})        // method 2

dotenv.config({
    path : './env'
});

dbConnect();

