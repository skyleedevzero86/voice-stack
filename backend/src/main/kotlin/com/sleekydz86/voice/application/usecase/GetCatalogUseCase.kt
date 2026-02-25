package com.sleekydz86.voice.application.usecase

import com.sleekydz86.voice.application.dto.LanguagesResponseDto
import com.sleekydz86.voice.application.dto.SpeakerDto
import com.sleekydz86.voice.application.dto.SpeakersResponseDto
import com.sleekydz86.voice.domain.tts.SpeakerCatalog
import org.springframework.stereotype.Component

@Component
class GetCatalogUseCase {

    fun speakers(): SpeakersResponseDto =
        SpeakersResponseDto(speakers = SpeakerCatalog.all.map {
            SpeakerDto(
                it.id,
                it.name,
                it.description,
                it.nativeLanguage
            )
        })

    fun languages(): LanguagesResponseDto =
        LanguagesResponseDto(languages = SpeakerCatalog.languages)
}
