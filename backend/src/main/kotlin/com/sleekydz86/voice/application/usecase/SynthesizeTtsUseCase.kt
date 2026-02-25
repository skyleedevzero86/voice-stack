package com.sleekydz86.voice.application.usecase

import com.sleekydz86.voice.application.dto.CustomVoiceCommand
import com.sleekydz86.voice.application.dto.TtsResponseDto
import com.sleekydz86.voice.application.dto.VoiceCloneCommand
import com.sleekydz86.voice.application.dto.VoiceDesignCommand
import com.sleekydz86.voice.application.port.TtsGateway
import com.sleekydz86.voice.application.service.RefAudioResolver
import com.sleekydz86.voice.domain.tts.WavEncoder
import org.springframework.stereotype.Component

@Component
class SynthesizeTtsUseCase(
    private val ttsGateway: TtsGateway,
    private val refAudioResolver: RefAudioResolver
) {

    fun customVoice(cmd: CustomVoiceCommand): TtsResponseDto =
        mapRemoteToDto(ttsGateway.synthesizeCustomVoice(cmd.text, cmd.language, cmd.speaker, cmd.instruct.orEmpty()))

    fun customVoiceToWav(cmd: CustomVoiceCommand): ByteArray {
        val remote = ttsGateway.synthesizeCustomVoice(cmd.text, cmd.language, cmd.speaker, cmd.instruct.orEmpty())
        if (!remote.success || remote.audioBase64 == null || remote.sampleRate == null)
            throw IllegalStateException(remote.message ?: "TTS 합성 실패")
        return WavEncoder.pcmBase64ToWavBytes(remote.audioBase64, remote.sampleRate, 1)
    }

    fun voiceDesign(cmd: VoiceDesignCommand): TtsResponseDto =
        mapRemoteToDto(ttsGateway.synthesizeVoiceDesign(cmd.text, cmd.language, cmd.instruct))

    fun voiceClone(cmd: VoiceCloneCommand): TtsResponseDto {
        val refAudioForTts = refAudioResolver.resolveToRefAudioForTts(cmd.refAudio)
        return mapRemoteToDto(ttsGateway.synthesizeVoiceClone(cmd.text, cmd.language, refAudioForTts, cmd.refText, cmd.xVectorOnlyMode))
    }

    private fun mapRemoteToDto(r: com.sleekydz86.voice.application.dto.RemoteTtsResponse): TtsResponseDto =
        TtsResponseDto(
            success = r.success,
            audioBase64 = r.audioBase64,
            sampleRate = r.sampleRate,
            errorCode = r.errorCode,
            message = r.message
        )
}
