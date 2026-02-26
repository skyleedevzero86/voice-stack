package com.sleekydz86.voice.application.port

import com.sleekydz86.voice.application.dto.SynthesisRecordDto

interface SynthesisRecordRepository {

    fun save(text: String, mode: String, language: String, speakerOrInstruct: String?, storageKey: String): SynthesisRecordDto

    fun findById(id: Long): SynthesisRecordDto?

    fun findAll(page: Int, size: Int, search: String?): Pair<List<SynthesisRecordDto>, Long>
}
