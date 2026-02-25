package com.sleekydz86.voice.application.usecase

import com.sleekydz86.voice.application.dto.UploadRefAudioResponseDto
import com.sleekydz86.voice.application.port.RefAudioStoragePort
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import org.springframework.web.multipart.MultipartFile
import java.util.UUID

@Component
class UploadRefAudioUseCase(
    private val refAudioStorage: RefAudioStoragePort,
    @Value("\${minio.ref-audio-base-url:http://localhost:8081/api/tts/ref-audio}") private val refAudioBaseUrl: String
) {

    fun upload(file: MultipartFile): UploadRefAudioResponseDto {
        val key = "${UUID.randomUUID()}.${extensionOrWav(file.originalFilename)}"
        val bytes = file.bytes
        val contentType = file.contentType?.takeIf { it.isNotBlank() } ?: "audio/wav"
        refAudioStorage.save(key, bytes, contentType)
        val url = "${refAudioBaseUrl.trimEnd('/')}/$key"
        return UploadRefAudioResponseDto(url = url, key = key)
    }

    private fun extensionOrWav(filename: String?): String {
        if (filename.isNullOrBlank()) return "wav"
        val ext = filename.substringAfterLast('.', "").lowercase()
        return if (ext in listOf("wav", "mp3", "ogg", "webm", "flac")) ext else "wav"
    }
}
