package com.snappe.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record AddNoteRequest(
        @NotBlank String content,
        String createdBy
) {
}