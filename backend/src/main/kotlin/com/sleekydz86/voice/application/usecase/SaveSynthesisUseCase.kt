package com.sleekydz86.voice.application.usecase

import com.sleekydz86.voice.application.dto.SynthesisRecordDto
import com.sleekydz86.voice.application.port.RefAudioStoragePort
import com.sleekydz86.voice.application.port.SynthesisRecordRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import java.util.UUID

@Component
class SaveSynthesisUseCase(
    private val storage: RefAudioStoragePort,
    private val repository: SynthesisRecordRepository
) {

    private val log = LoggerFactory.getLogger(javaClass)

    fun save(
        wavBytes: ByteArray,
        text: String,
        mode: String,
        language: String,
        speakerOrInstruct: String?
    ): SynthesisRecordDto {
        val key = "synthesis/${UUID.randomUUID()}.wav"
        log.info("[저장 로직] 합성 음원 저장 시도. mode={}, wavSize={} bytes", mode, wavBytes.size)
        storage.save(key, wavBytes, "audio/wav")
        val record = repository.save(text, mode, language, speakerOrInstruct, key)
        log.info("[저장 로직] 합성 기록 저장 완료. ID={}", record.id)
        return record
    }
}
