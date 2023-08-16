# see if we can get away without 3.11
FROM python:3.8-slim

WORKDIR /usr/src/app

RUN /usr/local/bin/python -m pip install --upgrade pip

# see if it works without ffmpeg install
RUN apt update && apt install -y ffmpeg

COPY . .
RUN pip install --no-cache-dir -r requirements.txt

CMD [ "python", "app.py" ]