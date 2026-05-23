package com.snappe.backend.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

public record LeadResponse(
        Long id,
        String name,
        String phone,
        String email,
        String source,
        String status,
        Integer score,
        String city,
        LocalDate followUpDate,
        LocalDateTime dateAdded,
        Integer totalCalls,
        String assignedToName,
        Long assignedToId,
        Map<String, Object> customFields
) {
}