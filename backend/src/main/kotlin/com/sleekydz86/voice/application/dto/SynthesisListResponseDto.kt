package com.sleekydz86.voice.application.dto

data class SynthesisListResponseDto(
    val items: List<SynthesisRecordDto>,
    val total: Long,
    val page: Int,
    val size: Int,
    val totalPages: Int
)
