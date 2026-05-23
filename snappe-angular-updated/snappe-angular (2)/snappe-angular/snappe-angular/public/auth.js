// ============================================================
//  AUTH.JS  —  Users, Login, Session, Roles
//  Phase 2 - Multi-user login system
// ============================================================

// ============================================================
//  DEFAULT USERS  (pre-seeded for demo/R&D)
//  In Phase 7 (backend), these will come from a real database
// ============================================================

const DEFAULT_USERS = [
  {
    id: "u1",
    name: "Admin User",
    username: "admin",
    password: "admin123",
    role: "admin",
    avatar: "A",
    customerId: 1,
    createdAt: new Date().toLocaleDateString()
  },
  {
    id: "u2",
    name: "Raj Manager",
    username: "manager",
    password: "manager123",
    role: "manager",
    avatar: "M",
    customerId: 1,
    createdAt: new Date().toLocaleDateString()
  },
  {
    id: "u3",
    name: "Priya Sales",
    username: "salesrep",
    password: "sales123",
    role: "salesrep",
    avatar: "P",
    customerId: 2,
    createdAt: new Date().toLocaleDateString()
  },
  {
    id: "u4",
    name: "Deep",
    username: "deep",
    password: "deep123",
    role: "salesrep",
    avatar: "D",
    customerId: 2,
    createdAt: new Date().toLocaleDateString()
  },
  {
    id: "u5",
    name: "Shrawani",
    username: "shrawani",
    password: "shrawani123",
    role: "salesrep",
    avatar: "S",
    customerId: 3,
    createdAt: new Date().toLocaleDateString()
  },
  {
    id: "u6",
    name: "Dev",
    username: "dev",
    password: "dev123",
    role: "salesrep",
    avatar: "D",
    customerId: 99,
    createdAt: new Date().toLocaleDateString()
  }
];

// ============================================================
//  ROLE LABELS
// ============================================================

const ROLE_LABELS = {
  admin:    "Admin",
  manager:  "Manager",
  salesrep: "Sales Rep"
};

const ROLE_COLORS = {
  admin:    "#7C3AED",
  manager:  "#0EA5E9",
  salesrep: "#10B981"
};

// ============================================================
//  INIT USERS — seed default users if none exist
// ============================================================

function initUsers() {
  const existing = localStorage.getItem("users");
  if (!existing) {
    localStorage.setItem("users", JSON.stringify(DEFAULT_USERS));
    return;
  }

  const users = JSON.parse(existing || "[]");
  const merged = [...users];

  DEFAULT_USERS.forEach(defaultUser => {
    if (!merged.some(user => user.username === defaultUser.username)) {
      merged.push(defaultUser);
    }
  });

  localStorage.setItem("users", JSON.stringify(merged));
}

// ============================================================
//  GET ALL USERS
// ============================================================

function getUsers() {
  return JSON.parse(localStorage.getItem("users") || "[]");
}

// ============================================================
//  SAVE USERS
// ============================================================

function saveUsers(users) {
  localStorage.setItem("users", JSON.stringify(users));
}

// ============================================================
//  LOGIN — check username + password
//  Returns: user object if found, null if not
// ============================================================

function login(username, password) {
  const users = getUsers();
  const user  = users.find(
    u => u.username === username.trim() && u.password === password
  );
  return user || null;
}

// ============================================================
//  SESSION — save who is logged in
// ============================================================

function setSession(user) {
  // Save to sessionStorage — clears when browser tab closes
  sessionStorage.setItem("currentUser", JSON.stringify(user));
  try {
    // expose tenant/customer id globally for scripts that need it
    if (user && user.customerId) {
      window.CUSTOMER_ID = user.customerId;
    } else {
      window.CUSTOMER_ID = undefined;
    }
  } catch (e) {
    // ignore in older browsers
  }
}

function getSession() {
  const data = sessionStorage.getItem("currentUser");
  return data ? JSON.parse(data) : null;
}

function clearSession() {
  sessionStorage.removeItem("currentUser");
}

// ============================================================
//  GUARD — call this at top of every protected page
//  If not logged in → redirect to login.html
// ============================================================

function requireLogin() {
  const user = getSession();
  if (!user) {
    window.location.href = "/login";
    return null;
  }
  return user;
}

// ============================================================
//  LOGOUT
// ============================================================

function logout() {
  clearSession();
  window.location.href = "/login";
}

// ============================================================
//  ROLE CHECKS — use these in index.html / script.js
// ============================================================

function isAdmin(user) {
  return user && user.role === "admin";
}

function isManager(user) {
  return user && user.role === "manager";
}

function isSalesRep(user) {
  return user && user.role === "salesrep";
}

function canManageUsers(user) {
  return isAdmin(user);
}

function canAssignLeads(user) {
  return isAdmin(user) || isManager(user);
}

function canImportExport(user) {
  return isAdmin(user) || isManager(user);
}

function canCustomizeColumns(user) {
  return !!user;
}

function canSeeAllLeads(user) {
  return isAdmin(user) || isManager(user);
}

// ============================================================
//  CREATE USER — Admin only
// ============================================================

function createUser(name, username, password, role) {
  const users = getUsers();

  // Check username not already taken
  if (users.find(u => u.username === username)) {
    return { success: false, message: "Username already exists." };
  }

  const newUser = {
    id:        "u" + Date.now(),
    name:      name.trim(),
    username:  username.trim(),
    password:  password,
    role:      role,
    avatar:    name.trim()[0].toUpperCase(),
    createdAt: new Date().toLocaleDateString()
  };

  users.push(newUser);
  saveUsers(users);
  return { success: true, user: newUser };
}

// ============================================================
//  DELETE USER — Admin only (cannot delete self)
// ============================================================

function deleteUser(userId, currentUserId) {
  if (userId === currentUserId) {
    return { success: false, message: "You cannot delete your own account." };
  }

  let users = getUsers();
  const idx = users.findIndex(u => u.id === userId);

  if (idx === -1) {
    return { success: false, message: "User not found." };
  }

  users.splice(idx, 1);
  saveUsers(users);
  return { success: true };
}

// ============================================================
//  GET USER BY ID
// ============================================================

function getUserById(id) {
  return getUsers().find(u => u.id === id) || null;
}

// ============================================================
//  GET USER DISPLAY NAME
// ============================================================

function getUserName(id) {
  const u = getUserById(id);
  return u ? u.name : "Unassigned";
}
