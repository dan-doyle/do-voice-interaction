/**
 * @file Manages routing for the Speech-To-Text service
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

if (!fs.existsSync("./config/config.json")) {
    console.error("Could not find the configuration file: './config/config.json'");
    process.exit(1);
}

global.config = JSON.parse(fs.readFileSync("./config/config.json").toString());

/**
 * @import { speech_to_text, loadDeepSpeechModel } from "./routes/stt.js"
 * @see {@link ./routes/stt.js|stt.js}
 */
import { speech_to_text, loadDeepSpeechModel } from "./routes/stt.js";

const app = express();

//Generate the deepspeech model and if it fails, returns the error to the server console
try {
    var model = loadDeepSpeechModel();
} catch (error) {
    console.log("Error during deepspeech model construction");
    console.log(error);
}

app.use(cors());
app.use(logger("dev"));
//Has been added to enable audio blob transfers
app.use(express.text({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false }));

/**
 * @import { sampleData, isEmpty } from "./routes/index.js"
 * @see {@link "./routes/index.js"|index.js}
 */
import { sampleData, isEmpty } from "./routes/index.js";

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

/**
 * Get the speech to text transcription using the received audio blob
 * 
 * @name Speech-To-Text transcription post
 * @route {POST} /api/stt
 * @headerparam Content-type must be text/plain 
 */
app.post("/api/stt", (req, res) => {

    //If we receive an empty buffer or an undefined object we send back an error to the voice assistant service.
    if (isEmpty(req.body)) {
        res.statusCode = 400;
        res.json({"status":"fail", "message":"The request body contains nothing"});

    } else {
        //Transcription problem : to be figured out
        const buffer = Buffer.from(req.body, "utf16le");
        const textMessage = speech_to_text(buffer, model);

        console.log("Text message :", textMessage);

        // If deepspeech transcription is empty we send back an error to the voice assistant service.
        if (textMessage.length == 0) {
            res.statusCode = 400;
            res.json({"status":"fail", "service": "Speech To Text service","message": "no transcription for this"});
        } else {
            // Everything is fine, we send back the textMessage
            res.statusCode = 200;
            res.json({"status":"ok","text":textMessage});
        }
    }

});

export default app;