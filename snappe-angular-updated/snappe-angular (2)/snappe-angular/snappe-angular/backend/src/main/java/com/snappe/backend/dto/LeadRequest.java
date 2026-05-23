package com.snappe.backend.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public record LeadRequest(
        Long id,
        @NotBlank @Size(max = 255) String name,
        String phone,
        String email,
        String source,
        String status,
        Integer score,
        String city,
        LocalDate followUpDate,
        Integer totalCalls,
        Long customerId,
        String assignedToName,
        Long assignedToId,
        Map<String, Object> customFields
) {
}