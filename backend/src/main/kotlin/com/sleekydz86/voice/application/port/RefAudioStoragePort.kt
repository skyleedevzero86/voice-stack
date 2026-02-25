package com.sleekydz86.voice.application.port

interface RefAudioStoragePort {

    fun save(key: String, bytes: ByteArray, contentType: String): String

    fun getBytes(key: String): ByteArray?
}
