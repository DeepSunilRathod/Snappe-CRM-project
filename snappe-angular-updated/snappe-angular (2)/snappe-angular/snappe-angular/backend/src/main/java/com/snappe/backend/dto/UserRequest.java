package com.snappe.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UserRequest(
        @NotBlank @Size(max = 255) String name,
        @NotBlank @Size(max = 255) String username,
        @NotBlank @Size(max = 255) String password,
        @NotBlank @Size(max = 100) String role,
        Boolean enabled
) {
}