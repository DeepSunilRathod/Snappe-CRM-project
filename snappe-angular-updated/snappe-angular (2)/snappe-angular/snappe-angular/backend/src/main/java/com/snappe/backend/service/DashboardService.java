package com.snappe.backend.service;

import com.snappe.backend.dto.DashboardSummaryDto;
import com.snappe.backend.dto.LeadResponse;
import com.snappe.backend.entity.CustomerFieldDefinition;
import com.snappe.backend.entity.Lead;
import com.snappe.backend.repository.CustomerFieldDefinitionRepository;
import com.snappe.backend.repository.LeadRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

@Service
public class DashboardService {

    private final LeadRepository leadRepository;
    private final LeadService leadService;
    private final CustomerFieldDefinitionRepository fieldDefinitionRepository;
    private final ObjectMapper objectMapper;

    public DashboardService(LeadRepository leadRepository, LeadService leadService, CustomerFieldDefinitionRepository fieldDefinitionRepository, ObjectMapper objectMapper) {
        this.leadRepository = leadRepository;
        this.leadService = leadService;
        this.fieldDefinitionRepository = fieldDefinitionRepository;
        this.objectMapper = objectMapper;
    }

    public DashboardSummaryDto getSummary() {
        List<Lead> leads = leadRepository.findAll(Sort.by(Sort.Direction.DESC, "dateAdded"));

        long totalLeads = leads.size();
        Map<String, Long> byStatus = countByField(leads, "status", null);
        long wonLeads = countFromMap(byStatus, "Won");
        long newLeads = countFromMap(byStatus, "New");
        long contactedLeads = countFromMap(byStatus, "Contacted");
        long lostLeads = countFromMap(byStatus, "Lost");
        long totalCalls = leads.stream().mapToLong(lead -> lead.getTotalCalls() == null ? 0 : lead.getTotalCalls()).sum();
        long winRate = totalLeads == 0 ? 0 : Math.round((wonLeads * 100.0) / totalLeads);

        Map<String, Long> bySource = leads.stream().collect(Collectors.groupingBy(
                lead -> valueOrUnknown(lead.getSource()),
                LinkedHashMap::new,
                Collectors.counting()));

        List<LeadResponse> recentLeads = leads.stream()
                .limit(8)
                .map(leadService::toResponse)
                .toList();

        return new DashboardSummaryDto(totalLeads, wonLeads, newLeads, contactedLeads, lostLeads, totalCalls, winRate, bySource, byStatus, recentLeads);
    }

    public DashboardSummaryDto getSummary(Long customerId) {
        List<Lead> leads = leadRepository.findByCustomerIdOrderByDateAddedDesc(customerId);

        long totalLeads = leads.size();
        Map<String, Long> byStatus = countByField(leads, "status", null);
        long wonLeads = countFromMap(byStatus, "Won");
        long newLeads = countFromMap(byStatus, "New");
        long contactedLeads = countFromMap(byStatus, "Contacted");
        long lostLeads = countFromMap(byStatus, "Lost");
        long totalCalls = leads.stream().mapToLong(lead -> lead.getTotalCalls() == null ? 0 : lead.getTotalCalls()).sum();
        long winRate = totalLeads == 0 ? 0 : Math.round((wonLeads * 100.0) / totalLeads);

        Map<String, Long> bySource = leads.stream().collect(Collectors.groupingBy(
            lead -> valueOrUnknown(lead.getSource()),
            LinkedHashMap::new,
            Collectors.counting()));

        List<LeadResponse> recentLeads = leads.stream()
            .limit(8)
            .map(leadService::toResponse)
            .toList();

        return new DashboardSummaryDto(totalLeads, wonLeads, newLeads, contactedLeads, lostLeads, totalCalls, winRate, bySource, byStatus, recentLeads);
    }

    private long countFromMap(Map<String, Long> groupedCounts, String value) {
        return groupedCounts.entrySet().stream()
                .filter(entry -> entry.getKey().equalsIgnoreCase(value))
                .mapToLong(Map.Entry::getValue)
                .sum();
    }

    public List<Lead> getLeadsForCustomer(Long customerId) {
        return leadRepository.findByCustomerIdOrderByDateAddedDesc(customerId);
    }

    public Map<String, Long> getFieldAnalytics(Long customerId, String fieldKey) {
        List<Lead> leads = leadRepository.findByCustomerIdOrderByDateAddedDesc(customerId);
        CustomerFieldDefinition fieldDef = fieldDefinitionRepository.findByCustomerIdAndActiveTrueOrderByLabelAsc(customerId)
                .stream()
                .filter(field -> field.getKeyName().equals(fieldKey))
                .findFirst()
                .orElse(null);
        return countByField(leads, fieldKey, fieldDef);
    }

    public Map<String, Long> countByField(List<Lead> leads, String fieldKey, CustomerFieldDefinition fieldDef) {
        return leads.stream().collect(Collectors.groupingBy(
                lead -> normalizedFieldValue(lead, fieldKey, fieldDef),
                LinkedHashMap::new,
                Collectors.counting()));
    }

    private String normalizedFieldValue(Lead lead, String fieldKey, CustomerFieldDefinition fieldDef) {
        String directValue = switch (fieldKey) {
            case "name" -> lead.getName();
            case "phone" -> lead.getPhone();
            case "email" -> lead.getEmail();
            case "source" -> lead.getSource();
            case "status" -> lead.getStatus();
            case "city" -> lead.getCity();
            case "assignedToName" -> lead.getAssignedToName();
            case "score" -> lead.getScore() == null ? null : String.valueOf(lead.getScore());
            case "totalCalls" -> lead.getTotalCalls() == null ? null : String.valueOf(lead.getTotalCalls());
            case "followUpDate" -> lead.getFollowUpDate() == null ? null : String.valueOf(lead.getFollowUpDate());
            case "dateAdded" -> lead.getDateAdded() == null ? null : String.valueOf(lead.getDateAdded().toLocalDate());
            default -> null;
        };

        if (directValue != null && !directValue.isBlank()) {
            return directValue;
        }

        Map<String, Object> customFields = readCustomFields(lead.getCustomFieldsJson());
        Object customValue = customFields.get(fieldKey);
        if (customValue == null) {
            if (fieldDef != null && fieldDef.getDefaultValue() != null && !fieldDef.getDefaultValue().isBlank()) {
                return fieldDef.getDefaultValue();
            }
            return "Unknown";
        }

        if (customValue instanceof List<?> list) {
            return list.isEmpty() ? "Unknown" : String.join(", ", list.stream().map(String::valueOf).toList());
        }

        String value = String.valueOf(customValue).trim();
        return value.isBlank() ? "Unknown" : value;
    }

    private Map<String, Object> readCustomFields(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception ex) {
            return Map.of();
        }
    }

    private String valueOrUnknown(String value) {
        return value == null || value.isBlank() ? "Unknown" : value;
    }
}