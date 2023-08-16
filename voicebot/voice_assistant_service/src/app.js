/**
 * @file Manages routing of the voice-assistant service and socket communication with the client
 * @author Aurélie Beaugeard
 */

import express from 'express'
import cors from 'cors'
import logger from 'morgan'
import fs from 'fs'
import path from 'path'
import favicon from 'serve-favicon'

import { processAudioHotword, processAudioCommand, processTextCommand, processPossibleInterruption, testingProcessTextCommand, testingProcessAudioCommand } from './routes/voice_assistant.js'

if (!fs.existsSync('./config/config.json')) {
  console.error('Could not find the configuration file: \'./config/config.json\'')
  process.exit(1)
}

global.config = JSON.parse(fs.readFileSync('./config/config.json').toString())

const app = express()
const __dirname = path.resolve()

app.use(cors())
app.use(logger('dev'))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: false }))

/**
 * Get service status
 *
 * @name Getting service status
 * @route {GET} /api/status
 */
app.get('/api/status', (req, res) => res.send('Service is running'))

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')))
app.use('/', express.static(path.join(__dirname, 'public')))

/**
 * Function that manage the entire communication process between the server and the client
 * @param {SocketIO.Client} client The client with which the server communicates
 */
export function setupClient (client) {
  console.log('Client connected\n')
  console.log(`Attempting to connect to Interruption service at ${global.config.services.interruptionDetectionService}`);
  const interruptionServiceConnection = Client(global.config.services.interruptionDetectionService, { transports: ['websocket'] });
  interruptionServiceConnection.on('connect', () => {
    console.log(`Connected to Interruption service at ${global.config.services.interruptionDetectionService}`);
  });
  interruptionServiceConnection.on('connect_error', (error) => {
    console.log(`Connection Error to Interruption service: ${error}`);
  });  
  interruptionServiceConnection.on('interrupt-query-response', (data) => {
    /* should receive the following format:
    {
      isInterrupt: true,
      id: id
    }
    */
    if (data.isInterrupt) {
      client.emit('interrupt-detected', {id: data.id});
    }
  });

  client.on('audio-hotword', (request) => processAudioHotword(client, request))
  client.on('audio-command', (request) => processAudioCommand(client, request))
  client.on('text-command', (request) => processTextCommand(client, request))
  client.on('audio-interrupt', (request) => processPossibleInterruption(client, interruptionServiceConnection, request))
}

export default app
