FROM python:3.8-buster

# # NEW: Update pip
# RUN pip install --upgrade pip

# # NEW: Install compatible TensorFlow version (if available)
# RUN pip install tensorflow==2.7.0

RUN pip install -e git+https://github.com/bk121/rasa_personality.git#egg=rasa

CMD ["rasa","run","-m","/app/models", "--enable-api", "--endpoints","/app/config/endpoints.yml","--credentials","/app/config/credentials.yml"]

