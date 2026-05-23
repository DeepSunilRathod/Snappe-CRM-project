package com.snappe.backend.controller;

import com.snappe.backend.dto.DashboardSummaryDto;
import com.snappe.backend.service.DashboardService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.snappe.backend.entity.Lead;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/summary")
    public DashboardSummaryDto summary(@org.springframework.web.bind.annotation.RequestParam(required = false) Long customerId) {
        if (customerId == null) {
            return dashboardService.getSummary();
        }
        return dashboardService.getSummary(customerId);
    }

    @GetMapping("/counts")
    public Map<String, Long> counts(@org.springframework.web.bind.annotation.RequestParam Long customerId,
                                    @org.springframework.web.bind.annotation.RequestParam String groupBy) {
        // Fetch leads for customer
        List<Lead> leads = dashboardService.getLeadsForCustomer(customerId);

        ObjectMapper om = new ObjectMapper();

        Map<String, Long> grouped = new LinkedHashMap<>();

        if (groupBy != null && groupBy.startsWith("custom:")) {
            String key = groupBy.substring("custom:".length());
            grouped = leads.stream().collect(Collectors.groupingBy(lead -> {
                String cf = lead.getCustomFieldsJson();
                if (cf == null) return "Unknown";
                try {
                    JsonNode node = om.readTree(cf);
                    JsonNode val = node.get(key);
                    if (val == null || val.isNull()) return "Unknown";
                    return val.asText();
                } catch (Exception e) {
                    return "Unknown";
                }
            }, LinkedHashMap::new, Collectors.counting()));
        } else {
            String prop = groupBy == null ? "status" : groupBy;
            grouped = leads.stream().collect(Collectors.groupingBy(lead -> {
                switch (prop) {
                    case "source": return valueOrUnknown(lead.getSource());
                    case "status": return valueOrUnknown(lead.getStatus());
                    case "city": return valueOrUnknown(lead.getCity());
                    case "assignedTo": return valueOrUnknown(lead.getAssignedToName());
                    default: return "Unknown";
                }
            }, LinkedHashMap::new, Collectors.counting()));
        }

        return grouped;
    }

    private String valueOrUnknown(String value) {
        return value == null || value.isBlank() ? "Unknown" : value;
    }
}