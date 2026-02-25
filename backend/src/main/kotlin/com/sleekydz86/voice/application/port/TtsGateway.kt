package com.sleekydz86.voice.application.port

import com.sleekydz86.voice.application.dto.RemoteTtsResponse


interface TtsGateway {

    fun synthesizeCustomVoice(text: String, language: String, speaker: String, instruct: String): RemoteTtsResponse
    fun synthesizeVoiceDesign(text: String, language: String, instruct: String): RemoteTtsResponse
    fun synthesizeVoiceClone(text: String, language: String, refAudio: String, refText: String?, xVectorOnlyMode: Boolean): RemoteTtsResponse
}
