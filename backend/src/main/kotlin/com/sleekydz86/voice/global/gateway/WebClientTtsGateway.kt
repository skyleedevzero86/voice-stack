package com.sleekydz86.voice.global.gateway

import com.sleekydz86.voice.application.dto.RemoteTtsResponse
import com.sleekydz86.voice.application.port.TtsGateway
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import org.springframework.web.reactive.function.client.WebClient
import org.springframework.web.reactive.function.client.bodyToMono
import reactor.core.publisher.Mono

@Component
class WebClientTtsGateway(
    private val webClient: WebClient,
    @Value("\${tts.service.base-url:http://localhost:8000}") private val baseUrl: String
) : TtsGateway {

    private val log = LoggerFactory.getLogger(javaClass)

    override fun synthesizeCustomVoice(text: String, language: String, speaker: String, instruct: String): RemoteTtsResponse =
        call("/tts/custom-voice", mapOf("text" to text, "language" to language, "speaker" to speaker, "instruct" to instruct))

    override fun synthesizeVoiceDesign(text: String, language: String, instruct: String): RemoteTtsResponse =
        call("/tts/voice-design", mapOf("text" to text, "language" to language, "instruct" to instruct))

    override fun synthesizeVoiceClone(text: String, language: String, refAudio: String, refText: String?, xVectorOnlyMode: Boolean): RemoteTtsResponse =
        call("/tts/voice-clone", mapOf(
            "text" to text,
            "language" to language,
            "ref_audio" to refAudio,
            "ref_text" to (refText ?: ""),
            "x_vector_only_mode" to xVectorOnlyMode
        ))

    private fun call(path: String, body: Map<String, Any>): RemoteTtsResponse {
        return try {
            val map = webClient.post()
                .uri(baseUrl + path)
                .bodyValue(body)
                .retrieve()
                .bodyToMono<Map<String, Any>>()
                .onErrorResume { e ->
                    log.warn("TTS 게이트웨이 호출 실패: {}", e.message)
                    val msg = if (baseUrl.contains("localhost") || baseUrl.contains("127.0.0.1"))
                        "TTS 서비스가 실행 중이 아닙니다. TTS_SERVICE_URL을 설정하거나 qwen-tts 서비스를 실행하세요."
                    else (e.message ?: "TTS 서비스를 사용할 수 없습니다.")
                    Mono.just(mapOf("success" to false, "message" to msg))
                }
                .block() ?: mapOf("success" to false, "message" to "TTS 서비스가 빈 응답을 반환했습니다.")

            RemoteTtsResponse(
                success = map["success"] as? Boolean ?: false,
                audioBase64 = map["audioBase64"] as? String,
                sampleRate = (map["sampleRate"] as? Number)?.toInt(),
                errorCode = map["errorCode"] as? String,
                message = map["message"] as? String
            )
        } catch (e: Exception) {
            log.error("TTS 게이트웨이 오류", e)
            RemoteTtsResponse(success = false, errorCode = "TTS_ERROR", message = e.message ?: "TTS 합성 실패")
        }
    }
}
