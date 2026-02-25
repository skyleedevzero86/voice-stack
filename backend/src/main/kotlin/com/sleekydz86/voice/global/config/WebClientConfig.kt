package com.sleekydz86.voice.global.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.web.reactive.function.client.WebClient

@Configuration
class WebClientConfig {

    @Bean
    fun webClient(
        @Value("\${tts.service.base-url:http://localhost:8000}") baseUrl: String
    ): WebClient = WebClient.builder()
        .baseUrl(baseUrl)
        .build()
}
