package com.sleekydz86.voice.application.dto

import java.time.Instant

data class SynthesisRecordDto(
    val id: Long,
    val text: String,
    val mode: String,
    val language: String,
    val speakerOrInstruct: String?,
    val storageKey: String,
    val createdAt: Instant
)
