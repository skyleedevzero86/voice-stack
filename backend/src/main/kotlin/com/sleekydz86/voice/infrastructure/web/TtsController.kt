package com.sleekydz86.voice.infrastructure.web

import com.sleekydz86.voice.application.dto.CustomVoiceCommand
import com.sleekydz86.voice.application.dto.LanguagesResponseDto
import com.sleekydz86.voice.application.dto.SpeakersResponseDto
import com.sleekydz86.voice.application.dto.SynthesisListResponseDto
import com.sleekydz86.voice.application.dto.SynthesisRecordDto
import com.sleekydz86.voice.application.dto.TtsResponseDto
import com.sleekydz86.voice.application.dto.UploadRefAudioResponseDto
import com.sleekydz86.voice.application.dto.VoiceCloneCommand
import com.sleekydz86.voice.application.dto.VoiceDesignCommand
import com.sleekydz86.voice.application.usecase.GetCatalogUseCase
import com.sleekydz86.voice.application.usecase.GetRefAudioUseCase
import com.sleekydz86.voice.application.usecase.GetSynthesisAudioUseCase
import com.sleekydz86.voice.application.usecase.GetSynthesisRecordUseCase
import com.sleekydz86.voice.application.usecase.ListSynthesisRecordsUseCase
import com.sleekydz86.voice.application.usecase.SaveSynthesisUseCase
import com.sleekydz86.voice.application.usecase.SynthesizeTtsUseCase
import com.sleekydz86.voice.application.usecase.UploadRefAudioUseCase
import com.sleekydz86.voice.domain.tts.WavEncoder
import jakarta.validation.Valid
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile

@RestController
@RequestMapping("/api/tts")
class TtsController(
    private val synthesizeTts: SynthesizeTtsUseCase,
    private val getCatalog: GetCatalogUseCase,
    private val uploadRefAudio: UploadRefAudioUseCase,
    private val getRefAudio: GetRefAudioUseCase,
    private val saveSynthesis: SaveSynthesisUseCase,
    private val listSynthesis: ListSynthesisRecordsUseCase,
    private val getSynthesisRecord: GetSynthesisRecordUseCase,
    private val getSynthesisAudio: GetSynthesisAudioUseCase
) {

    @PostMapping("/custom-voice", produces = [MediaType.APPLICATION_JSON_VALUE])
    fun customVoice(
        @Valid @RequestBody request: CustomVoiceCommand,
        @RequestParam(required = false) save: Boolean?
    ): ResponseEntity<TtsResponseDto> {
        val response = synthesizeTts.customVoice(request)
        if (save == true && response.success && response.audioBase64 != null && response.sampleRate != null) {
            val wavBytes = WavEncoder.pcmBase64ToWavBytes(response.audioBase64, response.sampleRate, 1)
            val speakerOrInstruct = if (request.instruct.isNullOrBlank()) request.speaker else "${request.speaker} / ${request.instruct}"
            val record = saveSynthesis.save(wavBytes, request.text, "custom-voice", request.language, speakerOrInstruct)
            return ResponseEntity.ok().header("X-Synthesis-Id", record.id.toString()).body(response)
        }
        return ResponseEntity.ok(response)
    }

    @PostMapping("/voice-design", produces = [MediaType.APPLICATION_JSON_VALUE])
    fun voiceDesign(
        @Valid @RequestBody request: VoiceDesignCommand,
        @RequestParam(required = false) save: Boolean?
    ): ResponseEntity<TtsResponseDto> {
        val response = synthesizeTts.voiceDesign(request)
        if (save == true && response.success && response.audioBase64 != null && response.sampleRate != null) {
            val wavBytes = WavEncoder.pcmBase64ToWavBytes(response.audioBase64, response.sampleRate, 1)
            val record = saveSynthesis.save(wavBytes, request.text, "voice-design", request.language, request.instruct)
            return ResponseEntity.ok().header("X-Synthesis-Id", record.id.toString()).body(response)
        }
        return ResponseEntity.ok(response)
    }

    @PostMapping("/voice-clone", produces = [MediaType.APPLICATION_JSON_VALUE])
    fun voiceClone(
        @Valid @RequestBody request: VoiceCloneCommand,
        @RequestParam(required = false) save: Boolean?
    ): ResponseEntity<TtsResponseDto> {
        val response = synthesizeTts.voiceClone(request)
        if (save == true && response.success && response.audioBase64 != null && response.sampleRate != null) {
            val wavBytes = WavEncoder.pcmBase64ToWavBytes(response.audioBase64, response.sampleRate, 1)
            val record = saveSynthesis.save(wavBytes, request.text, "voice-clone", request.language, null)
            return ResponseEntity.ok().header("X-Synthesis-Id", record.id.toString()).body(response)
        }
        return ResponseEntity.ok(response)
    }

    @PostMapping("/custom-voice/stream", produces = ["audio/wav"])
    fun customVoiceStream(
        @Valid @RequestBody request: CustomVoiceCommand,
        @RequestParam(required = false) save: Boolean?
    ): ResponseEntity<ByteArray> {
        val wavBytes = synthesizeTts.customVoiceToWav(request)
        val headers = HttpHeaders().apply {
            setContentType(MediaType.parseMediaType("audio/wav"))
            setContentLength(wavBytes.size.toLong())
        }
        if (save == true) {
            val record = saveSynthesis.save(wavBytes, request.text, "custom-voice", request.language, request.speaker)
            headers.set("X-Synthesis-Id", record.id.toString())
        }
        return ResponseEntity.ok().headers(headers).body(wavBytes)
    }

    @GetMapping("/synthesis")
    fun listSynthesis(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @RequestParam(required = false) search: String?
    ): ResponseEntity<SynthesisListResponseDto> =
        ResponseEntity.ok(listSynthesis.list(page, size, search))

    @GetMapping("/synthesis/{id}")
    fun getSynthesis(@PathVariable id: Long): ResponseEntity<SynthesisRecordDto> {
        val record = getSynthesisRecord.getById(id) ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(record)
    }

    @GetMapping("/synthesis/{id}/download", produces = ["audio/wav"])
    fun downloadSynthesis(@PathVariable id: Long): ResponseEntity<ByteArray> {
        val record = getSynthesisRecord.getById(id) ?: return ResponseEntity.notFound().build()
        val bytes = getSynthesisAudio.getAudioBytes(id) ?: return ResponseEntity.notFound().build()
        val headers = HttpHeaders().apply {
            setContentLength(bytes.size.toLong())
            setContentType(MediaType.parseMediaType("audio/wav"))
            set("Content-Disposition", "attachment; filename=\"synthesis-${id}.wav\"")
        }
        return ResponseEntity.ok().headers(headers).body(bytes)
    }

    @GetMapping("/speakers")
    fun getSpeakers(): ResponseEntity<SpeakersResponseDto> =
        ResponseEntity.ok(getCatalog.speakers())

    @GetMapping("/languages")
    fun getLanguages(): ResponseEntity<LanguagesResponseDto> =
        ResponseEntity.ok(getCatalog.languages())

    @PostMapping("/upload-ref-audio", produces = [MediaType.APPLICATION_JSON_VALUE])
    fun uploadRefAudio(@RequestParam("file") file: MultipartFile): ResponseEntity<UploadRefAudioResponseDto> {
        if (file.isEmpty) return ResponseEntity.badRequest().build()
        val result = uploadRefAudio.upload(file)
        return ResponseEntity.status(HttpStatus.CREATED).body(result)
    }

    @GetMapping("/ref-audio/{key}", produces = ["audio/wav", "audio/mpeg", "audio/ogg", "application/octet-stream"])
    fun getRefAudio(@PathVariable key: String): ResponseEntity<ByteArray> {
        if (key.contains("..") || key.contains("/")) return ResponseEntity.badRequest().build()
        val bytes = getRefAudio.getByKey(key) ?: return ResponseEntity.notFound().build()
        val headers = HttpHeaders().apply {
            setContentLength(bytes.size.toLong())
            set("Content-Disposition", "inline; filename=\"$key\"")
        }
        return ResponseEntity.ok().headers(headers).body(bytes)
    }
}
