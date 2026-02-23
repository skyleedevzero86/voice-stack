package com.sleekydz86.voice.domain.tts

sealed class TtsResult<out T> {
    data class Ok<T>(val value: T) : TtsResult<T>()
    data class Err(val errorCode: String, val message: String) : TtsResult<Nothing>()
}
