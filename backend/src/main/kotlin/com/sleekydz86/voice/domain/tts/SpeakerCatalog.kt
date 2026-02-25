package com.sleekydz86.voice.domain.tts

object SpeakerCatalog {

    val all: List<Speaker> = listOf(
        Speaker("Vivian", "Vivian", "Bright, slightly edgy young female voice.", "Chinese"),
        Speaker("Serena", "Serena", "Warm, gentle young female voice.", "Chinese"),
        Speaker("Uncle_Fu", "Uncle_Fu", "Seasoned male voice with a low, mellow timbre.", "Chinese"),
        Speaker("Dylan", "Dylan", "Youthful Beijing male voice with a clear, natural timbre.", "Chinese (Beijing Dialect)"),
        Speaker("Eric", "Eric", "Lively Chengdu male voice with a slightly husky brightness.", "Chinese (Sichuan Dialect)"),
        Speaker("Ryan", "Ryan", "Dynamic male voice with strong rhythmic drive.", "English"),
        Speaker("Aiden", "Aiden", "Sunny American male voice with a clear midrange.", "English"),
        Speaker("Ono_Anna", "Ono_Anna", "Playful Japanese female voice with a light, nimble timbre.", "Japanese"),
        Speaker("Sohee", "Sohee", "Warm Korean female voice with rich emotion.", "Korean")
    )

    val languages: List<String> = listOf(
        "Chinese", "English", "Japanese", "Korean", "German",
        "French", "Russian", "Portuguese", "Spanish", "Italian", "Auto"
    )
}
