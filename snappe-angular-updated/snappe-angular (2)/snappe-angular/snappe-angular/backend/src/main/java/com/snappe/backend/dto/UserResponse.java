package com.snappe.backend.dto;

import java.time.LocalDateTime;

public record UserResponse(
        Long id,
        String name,
        String username,
        String role,
        boolean enabled,
        LocalDateTime createdAt
) {
}