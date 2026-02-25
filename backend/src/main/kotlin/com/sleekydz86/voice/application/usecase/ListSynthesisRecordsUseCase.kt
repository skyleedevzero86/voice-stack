package com.sleekydz86.voice.application.usecase

import com.sleekydz86.voice.application.dto.SynthesisListResponseDto
import com.sleekydz86.voice.application.dto.SynthesisRecordDto
import com.sleekydz86.voice.application.port.SynthesisRecordRepository
import org.springframework.stereotype.Component

@Component
class ListSynthesisRecordsUseCase(private val repository: SynthesisRecordRepository) {

    fun list(page: Int, size: Int, search: String?): SynthesisListResponseDto {
        val (items, total) = repository.findAll(page, size, search)
        val sizeNorm = size.coerceIn(1, 100)
        val totalPages = if (total == 0L) 0 else ((total - 1) / sizeNorm + 1).toInt()
        return SynthesisListResponseDto(
            items = items,
            total = total,
            page = page,
            size = sizeNorm,
            totalPages = totalPages
        )
    }
}
