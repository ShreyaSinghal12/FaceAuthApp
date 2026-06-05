import numpy as np
try:
    import tensorflow as tf
    interpreter = tf.lite.Interpreter(model_path="android/app/src/main/assets/face_recognition.tflite")
except Exception:
    from tflite_runtime.interpreter import Interpreter
    interpreter = Interpreter(model_path="android/app/src/main/assets/face_recognition.tflite")

interpreter.allocate_tensors()
inp = interpreter.get_input_details()
out = interpreter.get_output_details()

print("=== INPUT ===")
for d in inp:
    print("shape:", d['shape'], "dtype:", d['dtype'], "quant:", d['quantization'])
print("=== OUTPUT ===")
for d in out:
    print("shape:", d['shape'], "dtype:", d['dtype'], "quant:", d['quantization'])