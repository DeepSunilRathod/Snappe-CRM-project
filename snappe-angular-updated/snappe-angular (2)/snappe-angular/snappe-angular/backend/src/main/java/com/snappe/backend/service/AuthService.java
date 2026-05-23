package com.snappe.backend.service;

import com.snappe.backend.dto.LoginRequest;
import com.snappe.backend.dto.LoginResponse;
import com.snappe.backend.entity.AppUser;
import com.snappe.backend.exception.UnauthorizedException;
import com.snappe.backend.repository.AppUserRepository;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final AppUserRepository userRepository;
    private final UserService userService;

    public AuthService(AppUserRepository userRepository, UserService userService) {
        this.userRepository = userRepository;
        this.userService = userService;
    }

    public LoginResponse login(LoginRequest request) {
        AppUser user = userRepository.findByUsernameIgnoreCase(request.username().trim())
                .filter(AppUser::isEnabled)
                .filter(found -> found.getPassword().equals(request.password()))
                .orElseThrow(() -> new UnauthorizedException("Invalid username or password"));

        return new LoginResponse("Login successful", userService.toResponse(user));
    }
}