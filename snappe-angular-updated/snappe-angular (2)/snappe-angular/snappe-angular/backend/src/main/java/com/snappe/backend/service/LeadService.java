package com.snappe.backend.service;

import com.snappe.backend.dto.AddNoteRequest;
import com.snappe.backend.dto.LeadRequest;
import com.snappe.backend.dto.LeadResponse;
import com.snappe.backend.dto.NoteResponse;
import com.snappe.backend.entity.AppUser;
import com.snappe.backend.entity.Lead;
import com.snappe.backend.entity.LeadNote;
import com.snappe.backend.exception.NotFoundException;
import com.snappe.backend.repository.AppUserRepository;
import com.snappe.backend.repository.LeadNoteRepository;
import com.snappe.backend.repository.LeadRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.data.domain.Sort;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LeadService {

    private final LeadRepository leadRepository;
    private final LeadNoteRepository leadNoteRepository;
    private final AppUserRepository userRepository;
    private final ObjectMapper objectMapper;

    public LeadService(LeadRepository leadRepository, LeadNoteRepository leadNoteRepository, AppUserRepository userRepository, ObjectMapper objectMapper) {
        this.leadRepository = leadRepository;
        this.leadNoteRepository = leadNoteRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    public List<LeadResponse> listLeads(String assignedTo) {
        List<Lead> leads = assignedTo == null || assignedTo.isBlank()
                ? leadRepository.findAll(Sort.by(Sort.Direction.DESC, "dateAdded"))
                : leadRepository.findByAssignedToNameIgnoreCaseOrderByDateAddedDesc(assignedTo.trim());
        return leads.stream().map(this::toResponse).toList();
    }

    public List<LeadResponse> listLeads(Long assignedToId) {
        List<Lead> leads = assignedToId == null
                ? leadRepository.findAll(Sort.by(Sort.Direction.DESC, "dateAdded"))
                : leadRepository.findByAssignedToIdOrderByDateAddedDesc(assignedToId);
        return leads.stream().map(this::toResponse).toList();
    }

    public List<LeadResponse> listLeadsByCustomer(Long customerId) {
        if (customerId == null) return listLeads((Long) null);
        List<Lead> leads = leadRepository.findByCustomerIdOrderByDateAddedDesc(customerId);
        return leads.stream().map(this::toResponse).toList();
    }

    public LeadResponse getLead(@NonNull Long id) {
        return toResponse(findLead(id));
    }

    @Transactional
    public LeadResponse createLead(LeadRequest request) {
        Lead lead = new Lead();
        applyRequest(lead, request);
        return toResponse(Objects.requireNonNull(leadRepository.save(lead)));
    }

    @Transactional
    public List<LeadResponse> syncLeads(List<LeadRequest> requests) {
        // Safer upsert: for each incoming request, try to find an existing lead by id, email or phone.
        return requests.stream()
                .map(request -> {
                    Lead lead = null;
                    if (request != null) {
                        Long rid = request.id();
                        if (rid != null) {
                            lead = leadRepository.findById(Objects.requireNonNull(rid)).orElse(null);
                        }
                        if (lead == null && request.email() != null && !request.email().isBlank()) {
                            lead = leadRepository.findByEmail(request.email());
                        }
                        if (lead == null && request.phone() != null && !request.phone().isBlank()) {
                            lead = leadRepository.findByPhone(request.phone());
                        }
                    }
                    if (lead == null) lead = new Lead();
                    applyRequest(lead, request);
                    return toResponse(Objects.requireNonNull(leadRepository.save(lead)));
                })
                .toList();
    }

    @Transactional
    public LeadResponse updateLead(@NonNull Long id, LeadRequest request) {
        Lead lead = findLead(id);
        applyRequest(lead, request);
        @SuppressWarnings("null")
        Lead savedLead = Objects.requireNonNull(leadRepository.save(lead));
        return toResponse(savedLead);
    }

    public void deleteLead(@NonNull Long id) {
        if (!leadRepository.existsById(id)) {
            throw new NotFoundException("Lead not found: " + id);
        }
        leadRepository.deleteById(id);
    }

    public List<NoteResponse> getNotes(@NonNull Long leadId) {
        findLead(leadId);
        return leadNoteRepository.findByLeadIdOrderByCreatedAtDesc(leadId).stream()
                .map(this::toNoteResponse)
                .toList();
    }

    @Transactional
    public NoteResponse addNote(@NonNull Long leadId, AddNoteRequest request) {
        Lead lead = findLead(leadId);
        LeadNote note = new LeadNote();
        note.setLead(lead);
        note.setContent(request.content().trim());
        note.setCreatedBy(request.createdBy() == null || request.createdBy().isBlank() ? "System" : request.createdBy().trim());
        return toNoteResponse(leadNoteRepository.save(note));
    }

    public LeadResponse toResponse(Lead lead) {
        return new LeadResponse(
                lead.getId(),
                lead.getName(),
                lead.getPhone(),
                lead.getEmail(),
                lead.getSource(),
                lead.getStatus(),
                lead.getScore(),
                lead.getCity(),
                lead.getFollowUpDate(),
                lead.getDateAdded(),
                lead.getTotalCalls(),
                lead.getAssignedToName(),
                lead.getAssignedTo() == null ? null : lead.getAssignedTo().getId(),
                readCustomFields(lead.getCustomFieldsJson())
        );
    }

    private NoteResponse toNoteResponse(LeadNote note) {
        return new NoteResponse(note.getId(), note.getContent(), note.getCreatedBy(), note.getCreatedAt());
    }

    private Lead findLead(@NonNull Long id) {
        return leadRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Lead not found: " + id));
    }

    private void applyRequest(Lead lead, LeadRequest request) {
        lead.setName(request.name().trim());
        lead.setPhone(request.phone());
        lead.setEmail(request.email());
        lead.setSource(request.source());
        lead.setStatus(request.status());
        lead.setScore(request.score());
        lead.setCity(request.city());
        lead.setFollowUpDate(request.followUpDate());
        lead.setTotalCalls(request.totalCalls() == null ? 0 : request.totalCalls());
        lead.setCustomerId(request.customerId());
        lead.setCustomFieldsJson(writeCustomFields(request.customFields()));

        if (request.assignedToId() != null) {
            AppUser assignedUser = userRepository.findById(Objects.requireNonNull(request.assignedToId()))
                    .orElseThrow(() -> new NotFoundException("Assigned user not found: " + request.assignedToId()));
            lead.setAssignedTo(assignedUser);
            lead.setAssignedToName(assignedUser.getName());
        } else {
            lead.setAssignedTo(null);
            lead.setAssignedToName(request.assignedToName());
        }
    }

    private Map<String, Object> readCustomFields(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() { });
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to read lead custom fields", ex);
        }
    }

    private String writeCustomFields(Map<String, Object> customFields) {
        if (customFields == null || customFields.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(customFields);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to write lead custom fields", ex);
        }
    }
}