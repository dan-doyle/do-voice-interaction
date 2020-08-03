/**
 * @file Manages some deepspeech utilities functions
 * @author Aurélie Beaugeard
*/

/* const Fs = require("fs"); */
/* var FileWriter = require("wav").FileWriter; */
/**
 * 
 */
const DeepSpeech = require("deepspeech");

/**
 * Function that returns the transcription of an audioBuffer using deepspeech node.
 * 
 * @param {Buffer} audioBuffer The audioBuffer to be transcripted (parameters to be verified : mono-channel,16000 Hz (sample rate), 16 bit PCM)
 * @param {DeepSpeech.Model} model The deepspeech model used to convert the speech to text
 * @returns {String} The text message from the user
 * @see {@link https://deepspeech.readthedocs.io/en/v0.7.4/NodeJS-API.html|DeepSpeech}
 */
export function speech_to_text(audioBuffer,model) {


    /*  if (!Fs.existsSync(audioFile)) {
        console.log("file missing:", audioFile);
        process.exit();
        }

    const buffer = Fs.readFileSync(audioFile); */

    let result = model.stt(audioBuffer);
    
    return result;

}

/**
 * Function that returns a pre-constructed DeepSpeech Model object
 * 
 * @description DEEPSPEECH VERSION: 0.7.4,
 * @description BEAM_WIDTH: 1024,
 * @description LM_ALPHA: 0.75,
 * @description LM_BETA: 1.85,
 * @see {@link https://deepspeech.readthedocs.io/en/v0.7.4/NodeJS-API.html|DeepSpeech}
 * @returns {DeepSpeech.Model}The model to be used for the transcription
 */
export function loadDeepSpeechModel() {

    const BEAM_WIDTH = 1024;
    let modelPath = "./src/models/deepspeech-0.7.4-models.pbmm";

    let model = new DeepSpeech.Model(modelPath);
    model.setBeamWidth(BEAM_WIDTH);

    const LM_ALPHA = 0.75;
    const LM_BETA = 1.85;
    let scorerPath = "./src/models/deepspeech-0.7.4-models.scorer";

    model.enableExternalScorer(scorerPath);
    model.setScorerAlphaBeta(LM_ALPHA,LM_BETA);

    return model;

}


/* export async function getAudio() {

    const writer = new FileWriter("./src/audio/test.wav", {
        sampleRate: 16000,
        channels: 1,
        bitDepth: 16
    });

    const response = await Axios({
        method: "GET",
        url: "http://localhost:4000/voice-assistant/record",
        responseType: "stream"
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
    });

}
 */