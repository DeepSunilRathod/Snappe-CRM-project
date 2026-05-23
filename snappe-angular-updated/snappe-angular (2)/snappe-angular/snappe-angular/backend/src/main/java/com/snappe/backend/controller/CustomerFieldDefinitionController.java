package com.snappe.backend.controller;

import com.snappe.backend.entity.CustomerFieldDefinition;
import com.snappe.backend.repository.CustomerFieldDefinitionRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.http.ResponseEntity;
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
@RequestMapping("/api/field-definitions")
public class CustomerFieldDefinitionController {

    private final CustomerFieldDefinitionRepository repository;

    public CustomerFieldDefinitionController(CustomerFieldDefinitionRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<CustomerFieldDefinition> list(@RequestParam Long customerId) {
        return repository.findByCustomerIdOrderByCreatedAtDesc(customerId);
    }

    @GetMapping("/active")
    public List<CustomerFieldDefinition> active(@RequestParam Long customerId) {
        return repository.findByCustomerIdAndActiveTrueOrderByLabelAsc(customerId);
    }

    @PostMapping
    public ResponseEntity<CustomerFieldDefinition> create(@RequestBody CustomerFieldDefinition field) {
        if (field.getCreatedAt() == null) {
            field.setCreatedAt(LocalDateTime.now());
        }
        if (field.getSourceType() == null || field.getSourceType().isBlank()) {
            field.setSourceType("lead");
        }
        return ResponseEntity.ok(repository.save(field));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CustomerFieldDefinition> update(@PathVariable @NonNull Long id, @RequestBody CustomerFieldDefinition field) {
        var existingOpt = repository.findById(id);
        if (existingOpt.isEmpty()) return ResponseEntity.notFound().build();
        var existing = existingOpt.get();
        if (existing.getCustomerId() == null || field.getCustomerId() == null || !existing.getCustomerId().equals(field.getCustomerId())) {
            return ResponseEntity.status(403).build();
        }
        existing.setLabel(field.getLabel());
        existing.setKeyName(field.getKeyName());
        existing.setDataType(field.getDataType());
        existing.setSourceType(field.getSourceType());
        existing.setRelationEntity(field.getRelationEntity());
        existing.setOptionsJson(field.getOptionsJson());
        existing.setDefaultValue(field.getDefaultValue());
        existing.setMultiSelect(field.isMultiSelect());
        existing.setActive(field.isActive());
        return ResponseEntity.ok(repository.save(existing));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable @NonNull Long id, @RequestParam(required = false) Long customerId) {
        var existingOpt = repository.findById(id);
        if (existingOpt.isEmpty()) return ResponseEntity.notFound().build();
        var existing = existingOpt.get();
        if (existing.getCustomerId() == null || (customerId != null && !existing.getCustomerId().equals(customerId))) {
            return ResponseEntity.status(403).build();
        }
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}