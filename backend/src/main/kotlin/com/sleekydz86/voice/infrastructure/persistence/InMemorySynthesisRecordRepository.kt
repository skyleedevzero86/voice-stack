package com.sleekydz86.voice.infrastructure.persistence

import com.sleekydz86.voice.application.dto.SynthesisRecordDto
import com.sleekydz86.voice.application.port.SynthesisRecordRepository
import org.springframework.stereotype.Component
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong

@Component
class InMemorySynthesisRecordRepository : SynthesisRecordRepository {

    private val store = ConcurrentHashMap<Long, SynthesisRecordDto>()
    private val idGen = AtomicLong(1)

    override fun save(text: String, mode: String, language: String, speakerOrInstruct: String?, storageKey: String): SynthesisRecordDto {
        val id = idGen.getAndIncrement()
        val now = Instant.now()
        val record = SynthesisRecordDto(
            id = id,
            text = text,
            mode = mode,
            language = language,
            speakerOrInstruct = speakerOrInstruct,
            storageKey = storageKey,
            createdAt = now
        )
        store[id] = record
        return record
    }

    override fun findById(id: Long): SynthesisRecordDto? = store[id]

    override fun findAll(page: Int, size: Int, search: String?): Pair<List<SynthesisRecordDto>, Long> {
        var list = store.values.toList().sortedByDescending { it.createdAt }
        if (!search.isNullOrBlank()) {
            val q = search.trim().lowercase()
            list = list.filter {
                it.text.lowercase().contains(q) ||
                        it.mode.lowercase().contains(q) ||
                        it.language.lowercase().contains(q) ||
                        (it.speakerOrInstruct?.lowercase()?.contains(q) == true)
            }
        }
        val total = list.size.toLong()
        val from = (page * size).coerceIn(0, list.size)
        val to = (from + size).coerceIn(0, list.size)
        val pageItems = list.subList(from, to)
        return pageItems to total
    }
}
