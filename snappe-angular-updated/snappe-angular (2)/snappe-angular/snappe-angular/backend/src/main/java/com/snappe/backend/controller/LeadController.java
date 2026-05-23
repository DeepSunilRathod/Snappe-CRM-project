package com.snappe.backend.controller;

import com.snappe.backend.dto.AddNoteRequest;
import com.snappe.backend.dto.LeadRequest;
import com.snappe.backend.dto.LeadResponse;
import com.snappe.backend.dto.NoteResponse;
import com.snappe.backend.service.LeadService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.lang.NonNull;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/leads")
public class LeadController {

    private final LeadService leadService;

    public LeadController(LeadService leadService) {
        this.leadService = leadService;
    }

    @GetMapping
    public List<LeadResponse> list(@RequestParam(required = false) String assignedTo,
                                   @RequestParam(required = false) Long customerId) {
        if (customerId != null) return leadService.listLeadsByCustomer(customerId);
        return leadService.listLeads(assignedTo);
    }

    @GetMapping(params = "assignedToId")
    public List<LeadResponse> listByAssigneeId(@RequestParam Long assignedToId) {
        return leadService.listLeads(assignedToId);
    }

    @GetMapping("/{id}")
    public LeadResponse getById(@PathVariable @NonNull Long id) {
        return leadService.getLead(id);
    }

    @PostMapping
    public LeadResponse create(@Valid @RequestBody LeadRequest request) {
        return leadService.createLead(request);
    }

    @PostMapping("/sync")
    public List<LeadResponse> sync(@Valid @RequestBody List<LeadRequest> requests) {
        return leadService.syncLeads(requests);
    }

    @PutMapping("/{id}")
    public LeadResponse update(@PathVariable @NonNull Long id, @Valid @RequestBody LeadRequest request) {
        return leadService.updateLead(id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable @NonNull Long id) {
        leadService.deleteLead(id);
    }

    @GetMapping("/{id}/notes")
    public List<NoteResponse> notes(@PathVariable @NonNull Long id) {
        return leadService.getNotes(id);
    }

    @PostMapping("/{id}/notes")
    public NoteResponse addNote(@PathVariable @NonNull Long id, @Valid @RequestBody AddNoteRequest request) {
        return leadService.addNote(id, request);
    }
}