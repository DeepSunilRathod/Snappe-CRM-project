package com.snappe.backend.dto;

public record LoginResponse(
        String message,
        UserResponse user
) {
}