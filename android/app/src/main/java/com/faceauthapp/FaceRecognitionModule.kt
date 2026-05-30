package com.faceauthapp

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import com.facebook.react.bridge.*
import org.tensorflow.lite.Interpreter
import java.io.FileInputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.MappedByteBuffer
import java.nio.channels.FileChannel

class FaceRecognitionModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    // Name that JS will use to call this module
    override fun getName(): String = "FaceRecognitionModule"

    // TFLite interpreter — loaded once, reused for every inference
    private var interpreter: Interpreter? = null

    // Model settings — must match facenet_int_quantized.tflite exactly
    private val MODEL_NAME = "facenet_int_quantized.tflite"
    private val INPUT_SIZE = 160        // model expects 160x160 pixel images
    private val EMBEDDING_SIZE = 128    // model outputs 128 float values
    private val IMAGE_MEAN = 128.0f
    private val IMAGE_STD = 128.0f

    init {
        // Load the model as soon as the module is created
        try {
            val options = Interpreter.Options().apply {
                numThreads = 2  // use 2 CPU threads for speed
            }
            interpreter = Interpreter(loadModelFromAssets(), options)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    // Load the .tflite file from the app's assets folder
    private fun loadModelFromAssets(): MappedByteBuffer {
        val assetManager = reactContext.assets
        val fileDescriptor = assetManager.openFd(MODEL_NAME)
        val inputStream = FileInputStream(fileDescriptor.fileDescriptor)
        val fileChannel = inputStream.channel
        val startOffset = fileDescriptor.startOffset
        val declaredLength = fileDescriptor.declaredLength
        return fileChannel.map(FileChannel.MapMode.READ_ONLY, startOffset, declaredLength)
    }

    // This function is callable from JavaScript
    // JS calls: FaceRecognitionModule.getEmbedding(base64String, callback)
    @ReactMethod
    fun getEmbedding(base64Image: String, promise: Promise) {
        try {
            // Step 1: Convert base64 string back to a bitmap image
            val imageBytes = Base64.decode(base64Image, Base64.DEFAULT)
            val originalBitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
                ?: throw Exception("Failed to decode image")

            // Step 2: Resize to 160x160 (what the model expects)
            val resizedBitmap = Bitmap.createScaledBitmap(
                originalBitmap, INPUT_SIZE, INPUT_SIZE, true
            )

            // Step 3: Convert bitmap to ByteBuffer for TFLite
            val inputBuffer = convertBitmapToByteBuffer(resizedBitmap)

            // Step 4: Prepare output buffer — 128 floats
            val outputArray = Array(1) { FloatArray(EMBEDDING_SIZE) }

            // Step 5: Run the model — this is the actual AI inference
            val startTime = System.currentTimeMillis()
            interpreter?.run(inputBuffer, outputArray)
            val inferenceTime = System.currentTimeMillis() - startTime

            // Step 6: Convert result to a JS-readable array
            val embedding = outputArray[0]
            val resultArray = WritableNativeArray()
            embedding.forEach { value -> resultArray.pushDouble(value.toDouble()) }

            // Step 7: Return result + inference time to JS
            val result = WritableNativeMap()
            result.putArray("embedding", resultArray)
            result.putDouble("inferenceTime", inferenceTime.toDouble())

            promise.resolve(result)

        } catch (e: Exception) {
            promise.reject("INFERENCE_ERROR", e.message, e)
        }
    }

    // Convert a bitmap image into the float ByteBuffer the model needs
    private fun convertBitmapToByteBuffer(bitmap: Bitmap): ByteBuffer {
        // 4 bytes per float, 3 channels (RGB), INPUT_SIZE x INPUT_SIZE pixels
        val byteBuffer = ByteBuffer.allocateDirect(
            4 * INPUT_SIZE * INPUT_SIZE * 3
        )
        byteBuffer.order(ByteOrder.nativeOrder())

        val pixels = IntArray(INPUT_SIZE * INPUT_SIZE)
        bitmap.getPixels(pixels, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)

        // Normalize each pixel: subtract mean, divide by std
        // This matches how the model was trained
        for (pixel in pixels) {
            val r = ((pixel shr 16) and 0xFF)
            val g = ((pixel shr 8) and 0xFF)
            val b = (pixel and 0xFF)

            byteBuffer.putFloat((r - IMAGE_MEAN) / IMAGE_STD)
            byteBuffer.putFloat((g - IMAGE_MEAN) / IMAGE_STD)
            byteBuffer.putFloat((b - IMAGE_MEAN) / IMAGE_STD)
        }

        return byteBuffer
    }

    // Calculate cosine similarity between two embeddings
    // Returns value between -1 and 1 (1 = same person, -1 = completely different)
    @ReactMethod
    fun cosineSimilarity(embedding1: ReadableArray, embedding2: ReadableArray, promise: Promise) {
        try {
            val e1 = FloatArray(EMBEDDING_SIZE) { embedding1.getDouble(it).toFloat() }
            val e2 = FloatArray(EMBEDDING_SIZE) { embedding2.getDouble(it).toFloat() }

            var dotProduct = 0.0f
            var norm1 = 0.0f
            var norm2 = 0.0f

            for (i in 0 until EMBEDDING_SIZE) {
                dotProduct += e1[i] * e2[i]
                norm1 += e1[i] * e1[i]
                norm2 += e2[i] * e2[i]
            }

            val similarity = dotProduct / (Math.sqrt(norm1.toDouble()) * Math.sqrt(norm2.toDouble()))
            promise.resolve(similarity)

        } catch (e: Exception) {
            promise.reject("SIMILARITY_ERROR", e.message, e)
        }
    }

    // Clean up interpreter when module is destroyed
    override fun invalidate() {
        super.invalidate()
        interpreter?.close()
        interpreter = null
    }
}