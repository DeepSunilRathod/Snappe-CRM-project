package com.snappe.backend.dto;

import java.util.List;
import java.util.Map;

public record DashboardSummaryDto(
        long totalLeads,
        long wonLeads,
        long newLeads,
        long contactedLeads,
        long lostLeads,
        long totalCalls,
        long winRate,
        Map<String, Long> bySource,
        Map<String, Long> byStatus,
        List<LeadResponse> recentLeads
) {
}