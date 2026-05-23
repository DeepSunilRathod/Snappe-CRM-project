CREATE TABLE IF NOT EXISTS app_users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leads (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    source VARCHAR(100),
    status VARCHAR(100),
    score INT,
    city VARCHAR(255),
    follow_up_date DATE,
    date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_calls INT DEFAULT 0,
    assigned_to_name VARCHAR(255),
    assigned_to_id BIGINT,
    custom_fields_json LONGTEXT,
    CONSTRAINT fk_assigned_user
        FOREIGN KEY (assigned_to_id)
        REFERENCES app_users(id)
);

CREATE TABLE IF NOT EXISTS lead_notes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    content VARCHAR(2000) NOT NULL,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lead_id BIGINT NOT NULL,
    CONSTRAINT fk_lead
        FOREIGN KEY (lead_id)
        REFERENCES leads(id)
);

CREATE INDEX idx_leads_assigned_to_name ON leads(assigned_to_name);
CREATE INDEX idx_leads_assigned_to_id ON leads(assigned_to_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_date_added ON leads(date_added);
CREATE INDEX idx_lead_notes_lead_id ON lead_notes(lead_id);