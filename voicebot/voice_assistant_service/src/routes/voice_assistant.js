/**
 * @file Manages some voice-assistant utilities functions
 * @author Aurélie Beaugeard
 */

 import { postDataTTS, getDataRasa, postData, getBotEmotion } from './index.js'

 /**
  * Function that manages the actions to do if the deepspeech transcription has been successfully done
  * @param {SocketIO.Client} client The client with which the server comunicates
  * @param {JSON} sttResponse The deepspeech json response
  */

 export async function testingSuccessProcess (client, sttResponse, request, humanEmotion, humanThayers, botThayers, grammarCorrectionPositions, grammarCorrectionPrediction) {
  // Simple function: send base64 encoded audio to the chatbot
  console.log('Speech to text transcription : SUCCESS\n')

  var commandForDialogManager = sttResponse.text
  if (grammarCorrectionPrediction !== '') {
    commandForDialogManager = grammarCorrectionPrediction
  }
  console.log(botThayers)
  const botResult = await postData(global.config.services.dialogManagerService, '{"message":"' + commandForDialogManager + '","emotion":"' + botThayers + '"}', 'Data Observatory Control Service')
  console.log('bot result', botResult)

  if (true) {
    botThayers = "n/a" // SHOULD BE OK
    const data = fs.readFileSync('base64.txt', 'utf8');
    const audio_data = data.trim();
    // console.log('Base64 encoding read successfully and audio_data variable created');


    if (true) {
      // The user receives a transcript of her or his voice message for verification.
      // The text version of the bot answer is also sent and displayed on the user interface
      // Voice answer sent to the client through the socket
      client.emit('response', {
        id: request.id,
        date: request.date,
        command: sttResponse.text,
        emotion: humanEmotion,
        human_thayers: humanThayers,
        bot_thayers: botThayers,
        grammar_positions: grammarCorrectionPositions,
        grammar_prediction: grammarCorrectionPrediction,
        response: 'Dummy response text',
        audio: {
          data: audio_data,
          contentType: 'audio/mp3'
        }
      })
    }
  }
}

export async function testingProcessAudioCommand (client, request) {
  function writeToFile(base64audio) {
    const fs = require('fs');
    let filename = './full_interruption_base64_audio.txt';
  
    fs.writeFile(filename, base64audio, (err) => {
      if (err) {
        console.error('Error saving the Base64 audio file:', err);
      } else {
        console.log('Base64 audio file saved successfully:', filename);
      }
    });
  }    
  writeToFile(request.audio.data)
}

 export async function successProcess (client, sttResponse, request, humanEmotion, humanThayers, botThayers, grammarCorrectionPositions, grammarCorrectionPrediction) {
   // TODO: take care of grammarCorrectionMessage
   console.log('Speech to text transcription : SUCCESS\n')
 
   var commandForDialogManager = sttResponse.text
   if (grammarCorrectionPrediction !== '') {
     commandForDialogManager = grammarCorrectionPrediction
   }
   console.log(botThayers)
   const botResult = await postData(global.config.services.dialogManagerService, '{"message":"' + commandForDialogManager + '","emotion":"' + botThayers + '"}', 'Data Observatory Control Service')
   console.log('bot result', botResult)
 
   if (botResult.success) {
     const botResponseText = mergeText(botResult.data, '\n')
     const botResponseVoice = mergeText(botResult.data, ', ')
     botThayers=botResult.data[0].bot_thayers
 
     // We send the text message to the tts service to get back the voice answer.
     const voiceAnswer = await postDataTTS(global.config.services.ttsService, botResponseVoice, botThayers)
 
     if (voiceAnswer.success) {
       // The user receives a transcript of her or his voice message for verification.
       // The text version of the bot answer is also sent and displayed on the user interface
       // Voice answer sent to the client through the socket
       client.emit('response', {
         id: request.id,
         date: request.date,
         command: sttResponse.text,
         emotion: humanEmotion,
         human_thayers: humanThayers,
         bot_thayers: botThayers,
         grammar_positions: grammarCorrectionPositions,
         grammar_prediction: grammarCorrectionPrediction,
         response: botResponseText,
         audio: {
           data: voiceAnswer.data,
           contentType: voiceAnswer.contentType
         }
       })
     } else {
       // If Gtts raised an error, we send it to the client
       await errorProcess(client, voiceAnswer, sttResponse.text, request)
     }
   } else {
     await errorProcess(client, botResult.data, sttResponse.text, request)
   }
 }
 
 /**
  * Function that manages the actions to do if one of the service failed
  * @param {SocketIO.Client} client The client with which the server comunicates
  * @param {JSON} errorResponse The error json response
  * @param {String} sttResponseText The text received from the Speech To Text service
  */
 export async function errorProcess (client, errorResponse, sttResponseText, request, recentEmotion = 'error', grammarCorrectionPositions = [], grammarCorrectionPrediction = 'error') {
   // We generate an error voice message
   const voiceAnswer = await postDataTTS(global.config.services.ttsService, 'I encountered an error. Please consult technical support or try the request again')
 
   // We send the json content response to the client, to give a description to the user in an alert box
   // The voice alert is sent to the client to be played
   client.emit('response', {
     id: request.id,
     date: request.date,
     command: sttResponseText !== '' ? sttResponseText : '...',
     emotion: recentEmotion,
     grammar_positions: grammarCorrectionPositions,
     grammar_prediction: grammarCorrectionPrediction,
     audio: {
       data: voiceAnswer.data,
       contentType: voiceAnswer.contentType
     },
     error: errorResponse.text
   })
 }
 
 export async function processGrammarCorrection (sttResponse) {
   var grammarPositions = []
   var grammarPrediction = ''
   const dataForGrammarCorrection = { transcript: sttResponse.text }
   const grammarCorrectionResponse = await postData(global.config.services.grammarCorrectionService, JSON.stringify(dataForGrammarCorrection), 'Grammar Correction Service')
   console.log('grammarCorrectionResponse ', grammarCorrectionResponse)
 
   if (grammarCorrectionResponse.success) {
     grammarPositions = grammarCorrectionResponse.data.response
     grammarPrediction = grammarCorrectionResponse.data.predicted_sentence
     return [grammarPositions, grammarPrediction, null]
   } else {
     return [grammarPositions, grammarPrediction, 'error']
   }
 }
 
 export async function processEmotion (speech, sttResponse) {
   var humanEmotion = 'n/a'
   var humanThayers = 'n/a'
   const dataForEmotionRecognition = { audio: speech, transcript: sttResponse.text }
   const emotionRecognitionResponse = await postData(global.config.services.emotionRecognitionService, JSON.stringify(dataForEmotionRecognition), 'Emotion Recognition Service')
   console.log('emotionRecognitionResponse ', emotionRecognitionResponse)
 
   if (emotionRecognitionResponse.success) {
     humanEmotion = emotionRecognitionResponse.data.emotion
     humanThayers = emotionRecognitionResponse.data.thayers
     // Set the emotion slot in rasa via http api
     const newData = { event: 'slot', timestamp: null, name: 'emotion', value: humanEmotion }
     const botResult = await postData(global.config.services.rasaTrackerEvents, JSON.stringify(newData), 'Data Observatory Control Service')
     console.log('set emotion in rasa ', botResult)
 
     return [humanEmotion, humanThayers, null]
   } else {
     return [humanEmotion, humanThayers, emotionRecognitionResponse.data]
   }
 }
 
 export async function processAudioHotword (client, request) {
   if (request.audio.type !== 'audio/wav' || request.audio.sampleRate !== 16000) {
     const error = { status: 'fail', service: 'Voice-assistant service', text: 'The record format is wrong' }
     await errorProcess(client, error, '', request)
   } else {
     const p1 = new Promise((resolve, reject) => {
       resolve(postData(global.config.services.hotwordService, request.audio.data, 'Hotword Service'))
     })
     const p2 = new Promise((resolve, reject) => setTimeout(() => resolve('not-present'), global.config.hotword.timeout))
 
     const hotwordResponse = await Promise.race([p1, p2])
 
    //  console.log('Hotword response - ', hotwordResponse)
     client.emit('received-hotword-response', {})
 
     if (hotwordResponse.data.text === 'detected') {
       client.emit('hotword', {})
     }
   }
 }
 
 export async function processAudioCommand (client, request) {
   try{
   let botThayers="n/a"
   if (request.audio.type !== 'audio/wav' || request.audio.sampleRate !== 16000) {
     const error = { status: 'fail', service: 'Voice-assistant service', text: 'The record format is wrong' }
     await errorProcess(client, error, '', request)
   } else {
     const sttResponse = await postData(global.config.services.sttService, request.audio.data, 'Speech To Text Service')
     console.log('sttresponse', sttResponse)
 
     // If an error was encountered during the request or the string response is empty we inform the user through the event problem with the socket.
     // Else we can send the text transcript to the the text to speech service and sending the audiobuffer received to the client.
     if (sttResponse.success) {
       // Get tracker information from rasa
       const tracker = await getDataRasa(global.config.services.rasaTracker)
       // Get rasa's slot values
       const slots = tracker.data.slots
       // Only carry out emotion recognition if the speaker currently has it enabled in the slot
       var humanEmotion = 'n/a'
       var humanThayers = 'n/a'
       var grammarCorrectionPositions = []
       var grammarCorrectionPrediction = ''
       var error
       if (slots.emotion_detection_enabled) {
         [humanEmotion, humanThayers, error] = await processEmotion(request.audio.data, sttResponse.data)
         // TODO: look into what processEmotion failure means and if we want to fail here or continue
         if (error != null) {
           await errorProcess(client, error, '', request)
           return
         }
         console.log("Thayers from human:", humanThayers)
         let botEmotionResponse = await getBotEmotion(global.config.services.personalityService, humanThayers)
         botThayers = botEmotionResponse.data.personalityState
         console.log("Bot Emotion", botThayers)
       }
 
       if (slots.grammar_correction_enabled) {
         // Only carry out error correction if the speaker currently has it enabled in the slot
         [grammarCorrectionPositions, grammarCorrectionPrediction, error] = await processGrammarCorrection(sttResponse.data)
         if (error != null) {
           await errorProcess(client, error, '', request)
           return
         }
       }
 
       await successProcess(client, sttResponse.data, request, humanEmotion, humanThayers, botThayers, grammarCorrectionPositions, grammarCorrectionPrediction)
     } else {
       await errorProcess(client, sttResponse.data, '', request)
     }
   }
 }
 catch (e){
   console.log(e)
   return
 }
 }

 export async function testingProcessTextCommand (client, request) {
  const commandData = { text: request.command }

  if (commandData.data === '') {
    const error = { status: 'fail', service: 'Voice-assistant service', text: 'Nothing has been written' }
    await errorProcess(client, error, '', request)
  } else {
    var grammarCorrectionPositions = []
    var grammarCorrectionPrediction = ''

    await testingSuccessProcess(client, commandData, request, 'no detection for text-only command.', "n/a", "n/a", grammarCorrectionPositions, grammarCorrectionPrediction)
  }
}
 
 export async function processTextCommand (client, request) {
   const commandData = { text: request.command }
 
   if (commandData.data === '') {
     const error = { status: 'fail', service: 'Voice-assistant service', text: 'Nothing has been written' }
     await errorProcess(client, error, '', request)
   } else {
     // Get tracker information from rasa
     const tracker = await getDataRasa(global.config.services.rasaTracker)
     // Get rasa's slot values
     const slots = tracker.data.slots
     var grammarCorrectionPositions = []
     var grammarCorrectionPrediction = ''
     var error
     if (slots.grammar_correction_enabled) {
       // Only carry out grammar correction if the speaker currently has it enabled in the slot
       [grammarCorrectionPositions, grammarCorrectionPrediction, error] = await processGrammarCorrection(commandData)
       if (error != null) {
         await errorProcess(client, error, '', request)
         return
       }
     }
 
     await successProcess(client, commandData, request, 'no detection for text-only command.', "n/a", "n/a", grammarCorrectionPositions, grammarCorrectionPrediction)
   }
 }
 
 /**
  * Function used to merge a text answer
  * @param {JSON} result The json response
  * @param {String} separator the separator to use
  * @returns {String} The text answer
  */
 function mergeText (result, separator) {
   if (Array.isArray(result)) {
     return result.map(e => e.text).join(separator)
   } else {
     return Object.property.hasOwnProperty.call(result, 'text') ? result.text : ''
   }
 }
 
 export async function processPossibleInterruption (client, interruptionServiceConnection, request) {
  try{
  let botThayers="n/a"
  if (request.audio.type !== 'audio/wav' || request.audio.sampleRate !== 16000) {
    const error = { status: 'fail', service: 'Voice-assistant service', text: 'The record format is wrong' }
    await errorProcess(client, error, '', request)
  } else {
    console.log('INTERRUPTION AUDIO RECEIVED IN THE VOICE ASSISTANT, with uuid: ', request.id)
    console.log('RECEIVED AUDIO SAMPLE RATE OF: ', request.audio.sampleRate)

    function writeToFile(base64audio) {
      const fs = require('fs');
      let filename = './received_base64_audio.txt';
      let counter = 1;
      
      // Check if the file exists and increment the number until finding a non-existing file
      while (fs.existsSync(filename)) {
        filename = `./received_base64_audio_${counter}.txt`;
        counter++;
      }
    
      fs.writeFile(filename, base64audio, (err) => {
        if (err) {
          console.error('Error saving the Base64 audio file:', err);
        } else {
          console.log('Base64 audio file saved successfully:', filename);
        }
      });
    }    
    // writeToFile(request.audio.data)

    // const data = fs.readFileSync('base64.txt', 'utf8');
    // const audio_data = data.trim(); // Why were these here before??

    interruptionServiceConnection.emit('query-interrupt', {
      id: request.id,
      audio: {
        data: request.audio.data,
        contentType: request.audio.type
      }
    });
  }
}
catch (e){
  console.log(e)
  return
}
}