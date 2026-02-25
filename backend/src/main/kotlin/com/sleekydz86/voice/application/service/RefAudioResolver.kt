package com.sleekydz86.voice.application.service

import com.sleekydz86.voice.application.port.RefAudioStoragePort
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.util.Base64

@Component
class RefAudioResolver(
    private val refAudioStorage: RefAudioStoragePort,
    @Value("\${minio.ref-audio-base-url:http://localhost:8081/api/tts/ref-audio}") private val refAudioBaseUrl: String
) {

    fun resolveToRefAudioForTts(refAudio: String): String {
        val base = refAudioBaseUrl.trimEnd('/')
        if (!refAudio.startsWith("$base/")) return refAudio
        val key = refAudio.removePrefix("$base/").trim()
        if (key.isEmpty()) return refAudio
        val bytes = refAudioStorage.getBytes(key) ?: return refAudio
        return Base64.getEncoder().encodeToString(bytes)
    }
}
