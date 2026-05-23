package com.snappe.backend.repository;

import com.snappe.backend.entity.CustomColumn;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomColumnRepository extends JpaRepository<CustomColumn, Long> {
    List<CustomColumn> findByCustomerIdOrderByIdAsc(Long customerId);
}
