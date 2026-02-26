package com.sleekydz86.voice.application.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class VoiceCloneCommand(
    @field:NotBlank(message = "텍스트는 필수입니다")
    @field:Size(max = 10_000)
    val text: String,
    val language: String = "English",
    @field:NotBlank(message = "ref_audio(URL 또는 base64)는 필수입니다")
    val refAudio: String,
    val refText: String? = null,
    val xVectorOnlyMode: Boolean? = false
)
