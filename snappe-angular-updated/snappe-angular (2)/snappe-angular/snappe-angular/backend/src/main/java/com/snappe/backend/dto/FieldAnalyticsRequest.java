package com.snappe.backend.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record FieldAnalyticsRequest(
        Long customerId,
        String fieldKey,
        String sourceType,
        String metric
) {
}