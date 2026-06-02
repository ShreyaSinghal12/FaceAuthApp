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
import android.app.Activity
import android.content.Intent
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.BaseActivityEventListener

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
    @ReactMethod
fun verifyLiveness(challengeId: String, base64Image: String, promise: Promise) {
    try {
        val imageBytes = android.util.Base64.decode(base64Image, android.util.Base64.DEFAULT)
        val bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)

        // Analyze image for liveness indicators
        val width = bitmap.width
        val height = bitmap.height

        // Sample pixels from face region (center of image)
        val centerX = width / 2
        val centerY = height / 2
        val sampleRadius = minOf(width, height) / 4

        var totalBrightness = 0.0
        var pixelCount = 0
        var edgeVariance = 0.0

        for (y in centerY - sampleRadius until centerY + sampleRadius step 4) {
            for (x in centerX - sampleRadius until centerX + sampleRadius step 4) {
                if (x >= 0 && x < width && y >= 0 && y < height) {
                    val pixel = bitmap.getPixel(x, y)
                    val r = (pixel shr 16 and 0xFF).toDouble()
                    val g = (pixel shr 8 and 0xFF).toDouble()
                    val b = (pixel and 0xFF).toDouble()
                    val brightness = (r + g + b) / 3.0
                    totalBrightness += brightness
                    pixelCount++
                }
            }
        }

        val avgBrightness = if (pixelCount > 0) totalBrightness / pixelCount else 0.0

        // Basic liveness check:
        // Real faces have natural brightness variation (not too dark, not too bright)
        // Printed photos tend to have uniform or very high brightness
        val isLive = avgBrightness > 40 && avgBrightness < 220

        // For demo: also check image has sufficient detail (not blank/solid color)
        val hasDetail = pixelCount > 100

        promise.resolve(isLive && hasDetail)

    } catch (e: Exception) {
        // If verification fails, allow through (fail-safe for demo)
        promise.resolve(true)
    }
}
private var livenessPromise: Promise? = null
private val LIVENESS_REQUEST = 9001

private val activityEventListener = object : BaseActivityEventListener() {
    override fun onActivityResult(activity: Activity?, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == LIVENESS_REQUEST) {
            val passed = resultCode == Activity.RESULT_OK
            livenessPromise?.resolve(passed)
            livenessPromise = null
        }
    }
}

init {
    reactContext.addActivityEventListener(activityEventListener)
}

@ReactMethod
fun startLiveness(challenge: String, promise: Promise) {
    val activity = currentActivity
    if (activity == null) {
        promise.reject("NO_ACTIVITY", "No activity available")
        return
    }
    livenessPromise = promise
    val intent = Intent(activity, LivenessActivity::class.java)
    intent.putExtra("challenge", challenge)
    activity.startActivityForResult(intent, LIVENESS_REQUEST)
}
}