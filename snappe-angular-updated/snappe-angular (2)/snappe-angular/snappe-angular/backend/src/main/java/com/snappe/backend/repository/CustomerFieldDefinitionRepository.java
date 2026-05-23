package com.snappe.backend.repository;

import com.snappe.backend.entity.CustomerFieldDefinition;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerFieldDefinitionRepository extends JpaRepository<CustomerFieldDefinition, Long> {
    List<CustomerFieldDefinition> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
    List<CustomerFieldDefinition> findByCustomerIdAndActiveTrueOrderByLabelAsc(Long customerId);
}