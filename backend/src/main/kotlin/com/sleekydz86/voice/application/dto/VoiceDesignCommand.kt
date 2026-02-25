package com.sleekydz86.voice.application.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class VoiceDesignCommand(
    @field:NotBlank(message = "텍스트는 필수입니다")
    @field:Size(max = 10_000)
    val text: String,
    val language: String = "Auto",
    @field:NotBlank(message = "voice design에는 instruct가 필수입니다")
    val instruct: String
)
