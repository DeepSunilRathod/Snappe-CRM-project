package com.snappe.backend.repository;

import com.snappe.backend.entity.Lead;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LeadRepository extends JpaRepository<Lead, Long> {

    List<Lead> findByAssignedToNameIgnoreCaseOrderByDateAddedDesc(String assignedToName);

    List<Lead> findByAssignedToIdOrderByDateAddedDesc(Long assignedToId);

    List<Lead> findByAssignedToName(String assignedToName);

    Lead findByEmail(String email);

    Lead findByPhone(String phone);

    // Multi-tenant support: find leads by customer/tenant id
    List<Lead> findByCustomerIdOrderByDateAddedDesc(Long customerId);

    List<Lead> findByCustomerId(Long customerId);
}