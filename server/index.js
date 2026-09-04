require('dotenv').config()
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/connectDB');
const router = require('./routes/index')
const cookiesParser = require('cookie-parser')
const { app, server } = require('./socket/index');

app.use(cors({
    origin : [process.env.FRONTEND_URL, "http://localhost:3000", "http://127.0.0.1:3000"],
    credentials : true
}));

app.use(express.json())
app.use(cookiesParser())

const PORT = process.env.PORT || 8080

app.get('/',(request,response)=>{
    response.json({
        message : "server running at " + PORT
    });
});

app.use('/api',router)

connectDB().then(()=>{
    server.listen(PORT,()=>{
        console.log(`Server is running ` + PORT)
    })
})
