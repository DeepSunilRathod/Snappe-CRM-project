package com.snappe.backend.repository;

import com.snappe.backend.entity.LeadNote;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LeadNoteRepository extends JpaRepository<LeadNote, Long> {

    List<LeadNote> findByLeadIdOrderByCreatedAtDesc(Long leadId);
}