package com.sleekydz86.voice.application.usecase

import com.sleekydz86.voice.application.dto.SynthesisRecordDto
import com.sleekydz86.voice.application.port.SynthesisRecordRepository
import org.springframework.stereotype.Component

@Component
class GetSynthesisRecordUseCase(private val repository: SynthesisRecordRepository) {

    fun getById(id: Long): SynthesisRecordDto? = repository.findById(id)
}
