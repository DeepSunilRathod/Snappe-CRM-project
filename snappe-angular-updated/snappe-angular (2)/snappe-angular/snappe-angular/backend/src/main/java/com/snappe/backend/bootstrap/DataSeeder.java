package com.snappe.backend.bootstrap;

import com.snappe.backend.entity.AppUser;
import com.snappe.backend.entity.Lead;
import com.snappe.backend.repository.AppUserRepository;
import com.snappe.backend.repository.LeadRepository;
import java.util.List;
import java.util.Objects;
import org.springframework.boot.CommandLineRunner;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    private final AppUserRepository userRepository;
    private final LeadRepository leadRepository;

    public DataSeeder(AppUserRepository userRepository, LeadRepository leadRepository) {
        this.userRepository = userRepository;
        this.leadRepository = leadRepository;
    }

    @Override
    public void run(String... args) {
        seedUsers();

        if (leadRepository.count() == 0) {
            leadRepository.saveAll(Objects.requireNonNull(defaultLeads()));
        }
    }

    private void seedUsers() {
        defaultUsers().forEach(user -> {
            if (userRepository.findByUsernameIgnoreCase(user.getUsername()).isEmpty()) {
                userRepository.save(user);
            }
        });
    }

    private List<AppUser> defaultUsers() {
        AppUser admin = new AppUser();
        admin.setName("Admin User");
        admin.setUsername("admin");
        admin.setPassword("admin123");
        admin.setRole("admin");
        admin.setEnabled(true);

        AppUser manager = new AppUser();
        manager.setName("Raj Manager");
        manager.setUsername("manager");
        manager.setPassword("manager123");
        manager.setRole("manager");
        manager.setEnabled(true);

        AppUser sales = new AppUser();
        sales.setName("Priya Sales");
        sales.setUsername("salesrep");
        sales.setPassword("sales123");
        sales.setRole("salesrep");
        sales.setEnabled(true);

        return List.of(admin, manager, sales);
    }

    private List<Lead> defaultLeads() {
        AppUser assigned = userRepository.findByUsernameIgnoreCase("salesrep")
                .orElseGet(() -> userRepository.findAll(Sort.by(Sort.Direction.ASC, "name")).stream().findFirst().orElse(null));

        Lead lead1 = lead("Hitesh Gautam", "918864875442", "hitesh1sept25@gmail.com", "Facebook", "Lost", 42, "Mathura", 6, assigned);
        Lead lead2 = lead("Sneha Verma", "919999000111", "sneha@example.com", "Website", "New", 73, "Delhi", 1, assigned);
        Lead lead3 = lead("Arjun Mehta", "917777888999", "arjun@example.com", "WhatsApp", "Contacted", 61, "Noida", 3, assigned);

        return List.of(lead1, lead2, lead3);
    }

    private Lead lead(String name, String phone, String email, String source, String status, Integer score, String city, Integer totalCalls, AppUser assignedUser) {
        Lead lead = new Lead();
        lead.setName(name);
        lead.setPhone(phone);
        lead.setEmail(email);
        lead.setSource(source);
        lead.setStatus(status);
        lead.setScore(score);
        lead.setCity(city);
        lead.setTotalCalls(totalCalls);
        if (assignedUser != null) {
            lead.setAssignedTo(assignedUser);
            lead.setAssignedToName(assignedUser.getName());
        }
        return lead;
    }
}