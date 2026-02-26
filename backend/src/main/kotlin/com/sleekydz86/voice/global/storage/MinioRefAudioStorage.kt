package com.sleekydz86.voice.global.storage

import com.sleekydz86.voice.application.port.RefAudioStoragePort
import io.minio.MinioClient
import io.minio.PutObjectArgs
import io.minio.GetObjectArgs
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.io.ByteArrayInputStream

@Component
class MinioRefAudioStorage(
    private val minioClient: MinioClient,
    @Value("\${minio.bucket}") private val bucket: String
) : RefAudioStoragePort {

    private val log = LoggerFactory.getLogger(javaClass)

    @Volatile
    private var bucketReady = false

    init {
        ensureBucket()
    }

    private fun ensureBucket() {
        if (bucketReady) return
        try {
            if (!minioClient.bucketExists(io.minio.BucketExistsArgs.builder().bucket(bucket).build())) {
                minioClient.makeBucket(io.minio.MakeBucketArgs.builder().bucket(bucket).build())
                log.info("MinIO 버킷 생성됨: {}", bucket)
            }
            bucketReady = true
        } catch (e: Exception) {
            log.warn("버킷 확인/생성 실패 {}: {}", bucket, e.message)
        }
    }

    override fun save(key: String, bytes: ByteArray, contentType: String): String {
        ensureBucket()
        try {
            minioClient.putObject(
                PutObjectArgs.builder()
                    .bucket(bucket)
                    .`object`(key)
                    .stream(ByteArrayInputStream(bytes), bytes.size.toLong(), -1)
                    .contentType(contentType)
                    .build()
            )
            log.info("[저장 로직] MinIO에 WAV 파일 저장 완료. key={}, size={} bytes", key, bytes.size)
            return key
        } catch (e: Exception) {
            log.error("[저장 로직] MinIO가 떠 있지 않거나 연결 실패. WAV 파일 저장 단계에서 예외 발생. key={}, bucket={}, 오류={}", key, bucket, e.message, e)
            throw e
        }
    }

    override fun getBytes(key: String): ByteArray? {
        return try {
            val stream = minioClient.getObject(
                GetObjectArgs.builder()
                    .bucket(bucket)
                    .`object`(key)
                    .build()
            )
            stream.readAllBytes()
        } catch (e: Exception) {
            log.debug("참조 오디오 없음 key {}: {}", key, e.message)
            null
        }
    }
}
