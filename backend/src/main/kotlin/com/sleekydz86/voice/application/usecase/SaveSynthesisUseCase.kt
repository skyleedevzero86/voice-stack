package com.sleekydz86.voice.application.usecase

import com.sleekydz86.voice.application.dto.SynthesisRecordDto
import com.sleekydz86.voice.application.port.RefAudioStoragePort
import com.sleekydz86.voice.application.port.SynthesisRecordRepository
import org.springframework.stereotype.Component
import java.util.UUID

@Component
class SaveSynthesisUseCase(
    private val storage: RefAudioStoragePort,
    private val repository: SynthesisRecordRepository
) {

    fun save(
        wavBytes: ByteArray,
        text: String,
        mode: String,
        language: String,
        speakerOrInstruct: String?
    ): SynthesisRecordDto {
        val key = "synthesis/${UUID.randomUUID()}.wav"
        storage.save(key, wavBytes, "audio/wav")
        return repository.save(text, mode, language, speakerOrInstruct, key)
    }
}
