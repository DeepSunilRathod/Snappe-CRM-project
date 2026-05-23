package com.snappe.backend.controller;

import com.snappe.backend.entity.CustomColumn;
import com.snappe.backend.repository.CustomColumnRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.lang.NonNull;

@RestController
@RequestMapping("/api/custom-columns")
public class CustomColumnController {

    private final CustomColumnRepository repository;

    public CustomColumnController(CustomColumnRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<CustomColumn> list(@RequestParam Long customerId) {
        return repository.findByCustomerIdOrderByIdAsc(customerId);
    }

    @PostMapping
    public ResponseEntity<CustomColumn> create(@RequestBody CustomColumn column) {
        column.setCreatedAt(LocalDateTime.now());
        CustomColumn saved = repository.save(column);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<CustomColumn> update(@PathVariable @NonNull Long id, @RequestBody CustomColumn column) {
        var existingOpt = repository.findById(id);
        if (existingOpt.isEmpty()) return ResponseEntity.notFound().build();
        var existing = existingOpt.get();
        // tenant ownership check
        if (existing.getCustomerId() == null || column.getCustomerId() == null || !existing.getCustomerId().equals(column.getCustomerId())) {
            return ResponseEntity.status(403).build();
        }
        existing.setLabel(column.getLabel());
        existing.setKeyName(column.getKeyName());
        existing.setType(column.getType());
        existing.setOptionsJson(column.getOptionsJson());
        CustomColumn saved = repository.save(existing);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable @NonNull Long id, @RequestParam(required = false) Long customerId) {
        var existingOpt = repository.findById(id);
        if (existingOpt.isEmpty()) return ResponseEntity.notFound().build();
        var existing = existingOpt.get();
        Long ownerCid = existing.getCustomerId();
        if (ownerCid == null || (customerId != null && !ownerCid.equals(customerId))) {
            return ResponseEntity.status(403).build();
        }
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
