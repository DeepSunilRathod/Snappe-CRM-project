package com.snappe.backend.dto;

import java.time.LocalDateTime;

public record NoteResponse(
        Long id,
        String content,
        String createdBy,
        LocalDateTime createdAt
) {
}