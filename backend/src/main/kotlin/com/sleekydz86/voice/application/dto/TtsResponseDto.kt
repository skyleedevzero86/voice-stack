package com.sleekydz86.voice.application.dto

data class TtsResponseDto(
    val success: Boolean,
    val audioBase64: String? = null,
    val sampleRate: Int? = null,
    val errorCode: String? = null,
    val message: String? = null
)
