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
        val refText = cmd.refText?.takeIf { it.isNotBlank() }
        val xVectorOnly = cmd.xVectorOnlyMode == true || refText == null
        return mapRemoteToDto(ttsGateway.synthesizeVoiceClone(cmd.text, cmd.language, refAudioForTts, refText, xVectorOnly))
    }

    private fun mapRemoteToDto(r: com.sleekydz86.voice.application.dto.RemoteTtsResponse): TtsResponseDto {
        val hasAudio = r.success && !r.audioBase64.isNullOrBlank() && r.sampleRate != null
        return if (!hasAudio && r.success)
            TtsResponseDto(success = false, message = r.message ?: "오디오 데이터 없음")
        else
            TtsResponseDto(
                success = r.success,
                audioBase64 = r.audioBase64,
                sampleRate = r.sampleRate,
                errorCode = r.errorCode,
                message = r.message
            )
    }
}
