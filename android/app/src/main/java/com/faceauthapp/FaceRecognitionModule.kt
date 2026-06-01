package com.faceauthapp

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.ImageFormat
import android.graphics.Rect
import android.graphics.YuvImage
import com.facebook.react.bridge.*
import org.tensorflow.lite.Interpreter
import java.io.ByteArrayOutputStream
import java.io.FileInputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.MappedByteBuffer
import java.nio.channels.FileChannel
import kotlin.math.sqrt

class FaceRecognitionModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var faceRecognizer: Interpreter? = null
    private val INPUT_SIZE = 112
    private val EMBEDDING_SIZE = 192

    override fun getName() = "FaceRecognition"

    // Load model from assets
    @ReactMethod
    fun loadModel(promise: Promise) {
        try {
            val model = loadModelFile("face_recognition.tflite")
            faceRecognizer = Interpreter(model)
            promise.resolve("Model loaded successfully")
        } catch (e: Exception) {
            promise.reject("MODEL_LOAD_ERROR", e.message)
        }
    }

    // Get face embedding from base64 image
    @ReactMethod
    fun getEmbedding(base64Image: String, promise: Promise) {
        try {
            val recognizer = faceRecognizer
                ?: return promise.reject("NOT_LOADED", "Model not loaded")

            // Decode base64 to bitmap
            val imageBytes = android.util.Base64.decode(base64Image, android.util.Base64.DEFAULT)
            val bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
            val resized = Bitmap.createScaledBitmap(bitmap, INPUT_SIZE, INPUT_SIZE, true)

            // Convert to float buffer
            val inputBuffer = ByteBuffer.allocateDirect(1 * INPUT_SIZE * INPUT_SIZE * 3 * 4)
            inputBuffer.order(ByteOrder.nativeOrder())

            for (y in 0 until INPUT_SIZE) {
                for (x in 0 until INPUT_SIZE) {
                    val pixel = resized.getPixel(x, y)
                    // Normalize to [-1, 1]
                    inputBuffer.putFloat(((pixel shr 16 and 0xFF) / 127.5f) - 1f) // R
                    inputBuffer.putFloat(((pixel shr 8 and 0xFF) / 127.5f) - 1f)  // G
                    inputBuffer.putFloat(((pixel and 0xFF) / 127.5f) - 1f)         // B
                }
            }

            // Run inference
            val outputBuffer = Array(1) { FloatArray(EMBEDDING_SIZE) }
            recognizer.run(inputBuffer, outputBuffer)

            // Convert to JS array
            val result = WritableNativeArray()
            outputBuffer[0].forEach { result.pushDouble(it.toDouble()) }

            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("INFERENCE_ERROR", e.message)
        }
    }

    // Compute cosine similarity between two embeddings
    @ReactMethod
    fun cosineSimilarity(
        embeddingA: ReadableArray,
        embeddingB: ReadableArray,
        promise: Promise
    ) {
        try {
            var dot = 0.0
            var normA = 0.0
            var normB = 0.0

            for (i in 0 until embeddingA.size()) {
                val a = embeddingA.getDouble(i)
                val b = embeddingB.getDouble(i)
                dot += a * b
                normA += a * a
                normB += b * b
            }

            val similarity = if (normA == 0.0 || normB == 0.0) 0.0
            else dot / (sqrt(normA) * sqrt(normB))

            promise.resolve(similarity)
        } catch (e: Exception) {
            promise.reject("SIMILARITY_ERROR", e.message)
        }
    }

    private fun loadModelFile(modelName: String): MappedByteBuffer {
        val assetFileDescriptor = reactApplicationContext.assets.openFd(modelName)
        val inputStream = FileInputStream(assetFileDescriptor.fileDescriptor)
        val fileChannel = inputStream.channel
        return fileChannel.map(
            FileChannel.MapMode.READ_ONLY,
            assetFileDescriptor.startOffset,
            assetFileDescriptor.declaredLength
        )
    }
}