/**
 * @file Manages routing of the voice-assistant service and socket communication with the client 
 * @author Aurélie Beaugeard
*/

/**
 * @import { express } from "express";
 * @version 4.17.1
 */
import express from "express";
/**
 * @import { cors } from "cors";
 * @version 2.8.5
 */
import cors from "cors";
/**
 * @import { logger } from "morgan";
 * @version 1.9.1
 */
import logger from "morgan";
/**
 * @import { fs } from "fs"
 */
import fs from "fs";
/**
 * @import { http } from "http"
 */
import http from "http";
/**
 * @import { path } from "path"
 */
import path from "path";
/**
 * @import { socketio } from "socket.io"
 * @version 2.3.0
 */
import socketio from "socket.io";


if (!fs.existsSync("./config/config.json")) {
    console.error("Could not find the configuration file: './config/config.json'");
    process.exit(1);
}

global.config = JSON.parse(fs.readFileSync("./config/config.json").toString());

const app = express();
var httpServer = http.createServer(app);
var voiceAnswer;
const __dirname = path.resolve();
 


app.use(cors());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({extended: false}));

/**
 * @import { sampleData, postData, getData } from "./routes/index.js"
 * @see {@link "./routes/index.js"|index.js}
 */
import {sampleData, postData, getData} from "./routes/index.js";

/**
 * Get service status
 * 
 * @name Getting service status
 * @route {GET} /api/status
 */
app.get("/api/status", (req, res) => res.send("Service is running"));
/**
 * Test service with simple json response
 * 
 * @name Getting the test result
 * @route {GET} /api/json
 */
app.get("/api/json", sampleData);


app.use("/node_modules", express.static(__dirname + "/node_modules"));
/**
 * To serve static files such as images, CSS files, and JavaScript files, use the express.static built-in middleware function in Express.
 * 
 * @name Serving static files in Express
 * @route {USE} /api/echo
 * @see {@link https://expressjs.com/en/starter/static-files.html|Exprees}
 */
app.use("/api/echo", express.static("public"));

httpServer.listen(4000, () => {
    console.log("listening on *:4000\n");
});

//instanciation of a socket listening to the httpServer connected to the app 
var io = socketio.listen(httpServer);

io.on("connect",(client) =>{

    console.log("Client connected\n");


    //The user has recorded a message and the client sent it to the server
    client.on("message", async function(data) {

        console.log("RECORD DONE\n");

        //We get the audio blob and send it to the stt service
        const dataURL = data.audio.dataURL.split(",").pop();
    
        let sttResponse =  await postData("http://localhost:3000/api/stt",dataURL);

        //If an error was encountered during the request or the string response is empty we inform the user through the event problem with the socket.
        //Else we can send the text transcript to the the text to speech service and sending the audiobuffer received to the client.
        if(sttResponse!=null && sttResponse["status"]=="ok"){

            console.log("Speech to text transcription : SUCCESS\n");

            //The user receives a transcript of her or his voice message for verification.
            client.emit("user-request",{"user":sttResponse["text"]});

            //We send the text message to the tts service to get back the voice answer.
            voiceAnswer = await getData("http://localhost:5000/api/tts","The Data Observatory control service has not been integrated yet");
            
            //Voice answer sent to the client through the socket
            client.emit("result",voiceAnswer);

            //The text version of the bot answer is also sent and displayed on the user interface
            client.emit("robot-answer",{"robot":"The DO control service has not been integrated yet"});
        } else {

            //We geerate an error voice message
            voiceAnswer = await getData("http://localhost:5000/api/tts","I encountered an error. Please consult technical support or try the request again");
            
            //We send the json content response to the client, to give a description to the user in an alert box
            client.emit("problem",sttResponse);

            //The voice alert is sent to the client to be played
            client.emit("voice-alert",voiceAnswer);

            //We indicate to the user that its message is not perceived.
            client.emit("user-request",{"user":"..."});

            //We send the error robot text answer to the client.
            client.emit("robot-answer",{"robot":"I encountered an error. Please consult technical support or try the request again."});
            
            //Console error messages
            console.log("Speech to text transcription : FAIL\n");
            console.log("Status :",sttResponse["status"]);
            console.log("Concerned service : ",sttResponse["service"]);
            console.log("Error message :",sttResponse["message"]+"\n");
        }

    });
});

export default app;