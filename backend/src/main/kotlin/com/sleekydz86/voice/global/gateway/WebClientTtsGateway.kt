package com.sleekydz86.voice.global.gateway

import com.sleekydz86.voice.application.dto.RemoteTtsResponse
import com.sleekydz86.voice.application.port.TtsGateway
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import org.springframework.http.MediaType
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
            "refAudio" to refAudio,
            "refText" to (refText ?: ""),
            "xVectorOnlyMode" to xVectorOnlyMode
        ))

    private fun call(path: String, body: Map<String, Any>): RemoteTtsResponse {
        log.info("TTS stub call {} {}", path, baseUrl)
        return try {
            val rawBody = webClient.post()
                .uri(path)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String::class.java)
                .onErrorResume { e ->
                    log.warn("TTS 게이트웨이 호출 실패: {}", e.message)
                    val msg = if (baseUrl.contains("localhost") || baseUrl.contains("127.0.0.1"))
                        "TTS 서비스가 실행 중이 아닙니다. TTS_SERVICE_URL을 설정하거나 qwen-tts 서비스를 실행하세요."
                    else (e.message ?: "TTS 서비스를 사용할 수 없습니다.")
                    Mono.just("""{"success":false,"message":"$msg"}""")
                }
                .block() ?: """{"success":false,"message":"TTS 서비스가 빈 응답을 반환했습니다."}"""

            log.info("TTS stub raw response length={} (128000 근처면 정상, 19200이면 중간에서 잘림)", rawBody.length)
            if (rawBody.length < 50_000) {
                log.warn(
                    "TTS 스텁이 0.3초 분량만 반환 중입니다. 포트 8000에 예전 스텁이 떠 있을 수 있습니다. " +
                    "1) netstat -ano | findstr :8000 로 PID 확인 후 taskkill /PID <pid> /F  2) tts-server에서 python tts_stub.py 재실행  3) 브라우저에서 http://localhost:8000/tts/info 확인 (audioBase64Len=128000 이어야 함)"
                )
            }

            @Suppress("UNCHECKED_CAST")
            val map = (com.fasterxml.jackson.databind.ObjectMapper().readValue(rawBody, Map::class.java) as Map<String, Any>)

            val success = map["success"] as? Boolean ?: false
            val audioLen = (map["audioBase64"] as? String)?.length ?: 0
            log.info("TTS stub response {} {} audioBase64Len={}", path, if (success) "200" else "fail", audioLen)

            RemoteTtsResponse(
                success = success,
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
