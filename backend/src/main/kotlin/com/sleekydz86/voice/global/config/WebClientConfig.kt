package com.sleekydz86.voice.global.config

import io.netty.channel.ChannelOption
import io.netty.handler.timeout.ReadTimeoutHandler
import io.netty.handler.timeout.WriteTimeoutHandler
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.client.reactive.ReactorClientHttpConnector
import org.springframework.web.reactive.function.client.WebClient
import reactor.netty.http.client.HttpClient
import java.time.Duration
import java.util.concurrent.TimeUnit

@Configuration
class WebClientConfig {

    @Bean
    fun webClient(
        @Value("\${tts.service.base-url:http://localhost:8000}") baseUrl: String
    ): WebClient {
        val ttsTimeoutMinutes = 20L
        val httpClient = HttpClient.create()
            .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 5_000)
            .responseTimeout(Duration.ofMinutes(ttsTimeoutMinutes))
            .doOnConnected { conn ->
                conn.addHandlerLast(ReadTimeoutHandler(ttsTimeoutMinutes, TimeUnit.MINUTES))
                conn.addHandlerLast(WriteTimeoutHandler(ttsTimeoutMinutes, TimeUnit.MINUTES))
            }
        return WebClient.builder()
            .baseUrl(baseUrl)
            .clientConnector(ReactorClientHttpConnector(httpClient))
            .codecs { it.defaultCodecs().maxInMemorySize(4 * 1024 * 1024) }
            .build()
    }
}
