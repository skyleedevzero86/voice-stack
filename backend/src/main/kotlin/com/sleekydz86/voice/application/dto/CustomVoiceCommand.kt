package com.sleekydz86.voice.application.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class CustomVoiceCommand(
    @field:NotBlank(message = "텍스트는 필수입니다")
    @field:Size(max = 10_000)
    val text: String,
    val language: String = "Auto",
    val speaker: String = "Vivian",
    val instruct: String? = null
)
