package com.sleekydz86.voice.domain.tts

import java.util.Base64

object WavEncoder {

    fun pcmBase64ToWavBytes(base64: String, sampleRate: Int, channels: Int = 1): ByteArray {
        val pcm = Base64.getDecoder().decode(base64)
        return createWavHeader(pcm.size, sampleRate, channels) + pcm
    }

    fun createWavHeader(dataSize: Int, sampleRate: Int, channels: Int): ByteArray {
        val byteRate = sampleRate * channels * 2
        val blockAlign = (channels * 2).toShort()
        val header = ByteArray(44)
        val fileSize = dataSize + 36
        header[0] = 'R'.code.toByte(); header[1] = 'I'.code.toByte(); header[2] = 'F'.code.toByte(); header[3] = 'F'.code.toByte()
        header[4] = (fileSize and 0xff).toByte(); header[5] = (fileSize shr 8 and 0xff).toByte(); header[6] = (fileSize shr 16 and 0xff).toByte(); header[7] = (fileSize shr 24 and 0xff).toByte()
        header[8] = 'W'.code.toByte(); header[9] = 'A'.code.toByte(); header[10] = 'V'.code.toByte(); header[11] = 'E'.code.toByte()
        header[12] = 'f'.code.toByte(); header[13] = 'm'.code.toByte(); header[14] = 't'.code.toByte(); header[15] = ' '.code.toByte()
        header[16] = 16; header[17] = 0; header[18] = 0; header[19] = 0
        header[20] = 1; header[21] = 0
        header[22] = (channels and 0xff).toByte(); header[23] = (channels shr 8).toByte()
        header[24] = (sampleRate and 0xff).toByte(); header[25] = (sampleRate shr 8 and 0xff).toByte(); header[26] = (sampleRate shr 16 and 0xff).toByte(); header[27] = (sampleRate shr 24 and 0xff).toByte()
        header[28] = (byteRate and 0xff).toByte(); header[29] = (byteRate shr 8 and 0xff).toByte(); header[30] = (byteRate shr 16 and 0xff).toByte(); header[31] = (byteRate shr 24 and 0xff).toByte()
        header[32] = (blockAlign.toInt() and 0xff).toByte(); header[33] = (blockAlign.toInt() shr 8).toByte()
        header[34] = 16; header[35] = 0
        header[36] = 'd'.code.toByte(); header[37] = 'a'.code.toByte(); header[38] = 't'.code.toByte(); header[39] = 'a'.code.toByte()
        header[40] = (dataSize and 0xff).toByte(); header[41] = (dataSize shr 8 and 0xff).toByte(); header[42] = (dataSize shr 16 and 0xff).toByte(); header[43] = (dataSize shr 24 and 0xff).toByte()
        return header
    }
}
