package com.snappe.backend.controller;

import com.snappe.backend.entity.DashboardDefinition;
import com.snappe.backend.repository.DashboardDefinitionRepository;
import com.snappe.backend.service.DashboardService;
import java.time.LocalDateTime;
import java.util.Map;
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
@RequestMapping("/api/dashboards")
public class DashboardDefinitionController {

    private final DashboardDefinitionRepository repository;
    private final DashboardService dashboardService;

    public DashboardDefinitionController(DashboardDefinitionRepository repository, DashboardService dashboardService) {
        this.repository = repository;
        this.dashboardService = dashboardService;
    }

    @GetMapping
    public List<DashboardDefinition> list(@RequestParam Long customerId) {
        return repository.findByCustomerIdOrderByCreatedAtDesc(customerId);
    }

    @PostMapping
    public ResponseEntity<DashboardDefinition> save(@RequestBody DashboardDefinition def) {
        if (def.getCreatedAt() == null) {
            def.setCreatedAt(LocalDateTime.now());
        }
        DashboardDefinition saved = repository.save(def);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<DashboardDefinition> update(@PathVariable @NonNull Long id, @RequestBody DashboardDefinition def) {
        var existingOpt = repository.findById(id);
        if (existingOpt.isEmpty()) return ResponseEntity.notFound().build();
        var existing = existingOpt.get();
        if (existing.getCustomerId() == null || def.getCustomerId() == null || !existing.getCustomerId().equals(def.getCustomerId())) {
            return ResponseEntity.status(403).build();
        }
        existing.setName(def.getName());
        existing.setWidgetsJson(def.getWidgetsJson());
        existing.setOwnerId(def.getOwnerId());
        DashboardDefinition saved = repository.save(existing);
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

    @GetMapping("/analytics")
    public Map<String, Long> analytics(@RequestParam Long customerId, @RequestParam String fieldKey) {
        return dashboardService.getFieldAnalytics(customerId, fieldKey);
    }
}
