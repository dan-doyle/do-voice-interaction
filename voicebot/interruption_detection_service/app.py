import eventlet

from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit
from model.inference_pipeline import check_interruption
import base64
from pydub import AudioSegment
import io
import os

eventlet.monkey_patch()

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins="*")

audio_cache = {} 

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('connect')
def connect_handler():
    print('Client connected: ', request.remote_addr) # To do: add detail of client to the printing

# introduce local storage such that audio is kept, upon a true interruption clear it
@socketio.on('query-interrupt')
def handle_query_interrupt(data):
    audio = data['audio']['data']
    print('Audio snippet received: ', audio[:30])
    wav_data = base64.b64decode(audio)
    id = data['id']

    audio_segment = AudioSegment.from_wav(io.BytesIO(wav_data))

    # Check if ID is new, if not, create space in local storage
    if id not in audio_cache:
        audio_cache.clear() # reset audio cache so only one potential interruption stored at a time
        audio_cache[id] = audio_segment
    else:
        audio_cache[id] += audio_segment # concatenate with existing audio

    ##### START test file save ########
    output_path = "audio_cache/"
    if not os.path.exists(output_path):
        os.makedirs(output_path)
    file_name = f"{output_path}{id}.wav"
    audio_cache[id].export(file_name, format="wav")
    ##### END test file save #########

    is_interrupt = check_interruption(audio_cache[id])

    if is_interrupt:
        emit('interrupt-query-response', {'isInterrupt': True, 'id': id})
        del audio_cache[id] # storage of this interruption no longer needed

@socketio.on('disconnect')
def disconnect():
    print('Client disconnected')

if __name__ == '__main__':
    PORT = 8080
    socketio.run(app, host='0.0.0.0', port=PORT)
    print(f"Server running and listening on port {PORT}")
    # to run: docker run -p 8080:8080 image_name