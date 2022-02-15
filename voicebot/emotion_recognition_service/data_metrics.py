import warnings
warnings.filterwarnings('ignore',category=FutureWarning)
import tensorflow as tf

slim = tf.contrib.slim

class AttributeDict(dict):
    """
        Attribute dictionary - a convenience data structure, similar to SimpleNamespace in python 3.3
        One can use attributes to read/write dictionary content.
    """

    def __init__(self, *av, **kav):
        dict.__init__(self, *av, **kav)
        self.__dict__ = self

    def __eq__(self, other):
        if not isinstance(other, AttributeDict):
            return False
        return dict.__eq__(self, other) and self.__dict__ == other.__dict__

def metric_graph():
    with tf.variable_scope('CCC'):
        pred = tf.placeholder(tf.float32, [None, 2], name='pred')
        label = tf.placeholder(tf.float32, [None, 2], name='label')

        metric = {0: 0.0, 1: 0.0}

        for i in [0, 1]:
            # Caluclating concordance correlation coefficient (CCC)

            # The mean and variance are calculated by aggregating the 
            # contents of x (pred[:, i]) across axes ([0])
            pred_mean, pred_var = tf.nn.moments(pred[:, i], [0]) 

            gt_mean, gt_var = tf.nn.moments(label[:, i], [0])

            # Computes the mean of elements across dimensions of a tensor
            mean_cent_prod = tf.reduce_mean((pred[:, i] - pred_mean) * (label[:, i] - gt_mean))
            metric[i] = 2. * mean_cent_prod / (pred_var + gt_var + tf.square(pred_mean - gt_mean))

    return AttributeDict(
        eval_predictions=pred,
        eval_labels=label,
        eval_metric_arousal=metric[0], # CCC for arousal
        eval_metric_valence=metric[1], # CCC for valence
    )