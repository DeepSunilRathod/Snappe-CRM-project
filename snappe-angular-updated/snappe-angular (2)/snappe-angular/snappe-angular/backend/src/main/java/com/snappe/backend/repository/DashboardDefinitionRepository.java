package com.snappe.backend.repository;

import com.snappe.backend.entity.DashboardDefinition;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DashboardDefinitionRepository extends JpaRepository<DashboardDefinition, Long> {
    List<DashboardDefinition> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
}
