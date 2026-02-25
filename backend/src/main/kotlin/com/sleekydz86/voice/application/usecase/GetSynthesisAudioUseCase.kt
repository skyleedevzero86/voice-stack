package com.sleekydz86.voice.application.usecase

import com.sleekydz86.voice.application.port.RefAudioStoragePort
import com.sleekydz86.voice.application.port.SynthesisRecordRepository
import org.springframework.stereotype.Component

@Component
class GetSynthesisAudioUseCase(
    private val repository: SynthesisRecordRepository,
    private val storage: RefAudioStoragePort
) {

    fun getAudioBytes(id: Long): ByteArray? {
        val record = repository.findById(id) ?: return null
        return storage.getBytes(record.storageKey)
    }
}
