package com.snappe.backend.service;

import com.snappe.backend.dto.UserRequest;
import com.snappe.backend.dto.UserResponse;
import com.snappe.backend.entity.AppUser;
import com.snappe.backend.exception.NotFoundException;
import com.snappe.backend.repository.AppUserRepository;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final AppUserRepository userRepository;

    public UserService(AppUserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<UserResponse> listUsers() {
        return userRepository.findAll(Sort.by(Sort.Direction.ASC, "name"))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public UserResponse createUser(UserRequest request) {
        if (userRepository.existsByUsernameIgnoreCase(request.username().trim())) {
            throw new IllegalArgumentException("Username already exists");
        }

        AppUser user = new AppUser();
        applyRequest(user, request);
        return toResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse updateUser(@NonNull Long id, UserRequest request) {
        AppUser user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found: " + id));

        if (!user.getUsername().equalsIgnoreCase(request.username().trim())
                && userRepository.existsByUsernameIgnoreCase(request.username().trim())) {
            throw new IllegalArgumentException("Username already exists");
        }

        applyRequest(user, request);
        return toResponse(userRepository.save(user));
    }

    public void deleteUser(@NonNull Long id) {
        if (!userRepository.existsById(id)) {
            throw new NotFoundException("User not found: " + id);
        }
        userRepository.deleteById(id);
    }

    public UserResponse toResponse(AppUser user) {
        return new UserResponse(user.getId(), user.getName(), user.getUsername(), user.getRole(), user.isEnabled(), user.getCreatedAt());
    }

    private void applyRequest(AppUser user, UserRequest request) {
        user.setName(request.name().trim());
        user.setUsername(request.username().trim());
        user.setPassword(request.password());
        user.setRole(request.role().trim());
        user.setEnabled(request.enabled() == null || request.enabled());
    }
}