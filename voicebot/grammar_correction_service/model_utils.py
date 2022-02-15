import torch
import numpy as np
from pytorch_pretrained_bert import BertForMaskedLM
from transformers import BertModel, BertTokenizer
from keras.preprocessing.sequence import pad_sequences
from difflib import SequenceMatcher
import os.path
import requests

# Implementation of our custom BERT model: uses a linear
#   layer to output a single prediction
class CustomBERTModel(torch.nn.Module):
    def __init__(self):
        super(CustomBERTModel, self).__init__()
        self.bert = BertModel.from_pretrained('bert-base-uncased')
        self.linear = torch.nn.Linear(768, 1)

    # A forward pass through both the BERT model and linear layer
    def forward(self, input_ids):
        outputs = self.bert(input_ids, token_type_ids=None)

        # Gets the ouput of the last hidden layer of the BERT model
        last_hidden_states = outputs.last_hidden_state
        linear_output = self.linear(last_hidden_states[:,0,:])

        return linear_output

    # Modified state_dict to only save linear layer weights and bias
    def state_dict(self):
        return self.linear.state_dict()

    # Modified load_state_dict to only load linear layer weights and bias
    def load_state_dict(self, state_dict):
        self.linear.load_state_dict(state_dict)


# Sigmoid function for use in converting our model's preditions
#   to '0' and '1' tags
def sigmoid(x):
    return 1/(1 + np.exp(-x))


def progress_bar(some_iter):
    try:
        from tqdm import tqdm
        return tqdm(some_iter)
    except ModuleNotFoundError:
        return some_iter


# Load the grammar_checker model
def load_grammar_checker_model():
    # Load model to the cpu device for predictions
    device = torch.device('cpu')
    grammar_checker = CustomBERTModel()
    grammar_checker.load_state_dict(torch.load('bert-base-uncased-GDO-trained.pth', map_location=device))

    # Set to evaluation mode ready to predict
    grammar_checker.eval()

    return grammar_checker


def load_grammar_corrector_model():
    grammar_corrector = BertForMaskedLM.from_pretrained('bert-large-uncased')
    grammar_corrector.eval()

    return grammar_corrector


# Create a tokenizer for use in check_grammar and check_GE
def create_tokenizer():
    return BertTokenizer.from_pretrained('bert-base-uncased')


def create_mask_set(sentence, mask_id):
    sent = sentence.strip().split()
    new_sent = sent[:]
    if mask_id >= len(new_sent):
        print(new_sent)
        print(mask_id)
    new_sent[mask_id] = '[MASK]'
    return '[CLS] ' + " ".join(new_sent) + ' [SEP]'


# Check for a grammatical error using the grammar_checker_model
#   Takes in a list of sentences for which it will predict a
#   '0' for an INCORRECT or '1' for a CORRECT sentence
def check_GE(sents):
    # Tokenize each inputted sentence
    tokenized_texts = [tokenizer.tokenize(str(sent)) for sent in sents]

    # Padding sentences to the maximum length sentence
    padded_sequence = [tokenizer.convert_tokens_to_ids(txt) for txt in tokenized_texts]
    max_len = max([len(txt) for txt in padded_sequence])

    # Pad the input tokens
    input_ids = pad_sequences(padded_sequence, maxlen=max_len, dtype="long",
                              truncating="post", padding="post")

    prediction_inputs = torch.tensor(input_ids)

    with torch.no_grad():
        # Forward pass, calculate predictions
        logits = checker_model(prediction_inputs)

    # Move predictions to CPU
    logits = logits.detach().cpu().numpy()

    # To calculate the prediction, use sigmoid (since BCEWithLogitsLoss
    #   was used for training) and then round to the nearest integer ('0' or '1')
    predictions = np.rint(sigmoid(logits))

    return predictions


def check_grammar(original_sentence, masked_sentence):
    text = '[MASK]'
    tokenized_text = tokenizer.tokenize(text)
    mask_token = tokenizer.convert_tokens_to_ids(tokenized_text)[0]

    # tokenize the text
    tokenized_text = tokenizer.tokenize(masked_sentence)
    indexed_tokens = tokenizer.convert_tokens_to_ids(tokenized_text)

    # Create the segments tensors.
    segments_ids = [0] * len(tokenized_text)

    # Convert inputs to PyTorch tensors
    tokens_tensor = torch.tensor([indexed_tokens])
    segments_tensors = torch.tensor([segments_ids])

    # Predict all tokens
    with torch.no_grad():
        predictions = corrector_model(tokens_tensor, segments_tensors)

    # index of the masked token
    mask_index = (tokens_tensor == mask_token).nonzero()[0][1].item()
    # predicted token
    predicted_index = torch.argmax(predictions[0, mask_index]).item()
    predicted_token = tokenizer.convert_ids_to_tokens([predicted_index])[0]

    text = masked_sentence.strip().split()
    mask_index = text.index('[MASK]')

    text[mask_index] = predicted_token
    original_word = original_sentence.strip().split()[mask_index - 1]

    text.remove('[SEP]')
    text.remove('[CLS]')
    new_sent = " ".join(text)

    if original_word == predicted_token:
        return new_sent, True

    return new_sent, False


def predict_corrections(original_sentence, mask_ids):
    # Check grammatical correctness by masking each word
    # at position mask_id from list of mask_ids
    corrections = []
    sentence = original_sentence

    for i in range(len(mask_ids)):
        masked_sentence = create_mask_set(sentence, mask_ids[i])
        sentence, correct = check_grammar(sentence, masked_sentence)
        if not correct:
            corrections.append(mask_ids[i])

    return sentence, corrections


# Load pre-trained model tokenizer and models
tokenizer = create_tokenizer()
checker_model = load_grammar_checker_model()
corrector_model = load_grammar_corrector_model()
