# SnapPe Backend

Spring Boot + MySQL backend for the SnapPe Angular dashboard.

## Run it

1. Start MySQL and create a database named `snappe_leads`.
2. Set credentials if needed:

```powershell
$env:MYSQL_USER = "snappe"
$env:MYSQL_PASSWORD = "snappe123"
```

3. Start the app:

```powershell
cd backend
mvn spring-boot:run
```

## API surface

- `POST /api/auth/login`
- `GET /api/users`, `POST /api/users`, `PUT /api/users/{id}`, `DELETE /api/users/{id}`
- `GET /api/leads`, `POST /api/leads`, `PUT /api/leads/{id}`, `DELETE /api/leads/{id}`
- `GET /api/leads/{id}/notes`, `POST /api/leads/{id}/notes`
- `GET /api/dashboard/summary`
- `GET /api/health`

## Demo login

- `admin` / `admin123`
- `manager` / `manager123`
- `salesrep` / `sales123`