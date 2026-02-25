package com.sleekydz86.voice.application.usecase

import com.sleekydz86.voice.application.port.RefAudioStoragePort
import org.springframework.stereotype.Component

@Component
class GetRefAudioUseCase(private val refAudioStorage: RefAudioStoragePort) {

    fun getByKey(key: String): ByteArray? = refAudioStorage.getBytes(key)
}
