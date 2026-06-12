# APA Directus schema

Generated 2026-06-12T09:41:28.370Z from `https://fdnd-agency.directus.app` (Directus metadata API). Machine-readable version: [apa-schema.json](./apa-schema.json).

https://mermaid.ai/app/projects/6762e18a-98d8-4b0e-9d0e-8db914661361/diagrams/00689a57-898f-43cf-be53-f8ab50c3c873/version/v0.1/edit

## Entity-relationship diagram

```mermaid
erDiagram
    apa_api_clients {
        uuid id PK
        timestamp date_created
        string api_key_hash
        string email
        string email_lower
        string verify_code_hash
        dateTime verify_expires_at
        boolean verified
    }
    apa_cities {
        uuid id PK
        timestamp date_created
        string name
        string slug UK
        decimal latitude
        boolean active
        decimal longitude
    }
    apa_login_codes {
        uuid id PK
        timestamp date_created
        uuid user FK
        string code_hash
        dateTime expires_at
        dateTime used_at
        integer attempts
    }
    apa_measurements {
        uuid id PK
        timestamp date_created
        uuid sampling_point FK
        uuid tube FK
        dateTime date
        decimal value
    }
    apa_sampling_points {
        uuid id PK
        timestamp date_created
        timestamp date_updated
        integer point_number
        string location UK
        text description
        decimal latitude
        decimal longitude
        dateTime start_date
        boolean active
        uuid city FK
    }
    apa_sessions {
        uuid id PK
        timestamp date_created
        string token UK
        uuid user FK
        dateTime last_seen_at
        dateTime expires_at
    }
    apa_tubes {
        uuid id PK
        timestamp date_created
        string code
        boolean active
        text notes
        uuid city FK
    }
    apa_users {
        uuid id PK
        timestamp date_created
        timestamp date_updated
        string email UK
        string email_lower UK
        boolean active
        dateTime last_login_at
        string role
    }
    apa_users ||--o{ apa_login_codes : user
    apa_cities ||--o{ apa_sampling_points : city
    apa_tubes ||--o{ apa_measurements : tube
    apa_sampling_points ||--o{ apa_measurements : sampling_point
    apa_cities ||--o{ apa_tubes : city
    apa_users ||--o{ apa_sessions : user
```

## Collections

### apa_api_clients

| Field             | Type      | Null | Default | Key | References |
| ----------------- | --------- | ---- | ------- | --- | ---------- |
| id                | uuid      | no   |         | PK  |            |
| date_created      | timestamp | yes  |         |     |            |
| api_key_hash      | string    | yes  |         |     |            |
| email             | string    | no   |         |     |            |
| email_lower       | string    | no   |         |     |            |
| verify_code_hash  | string    | yes  |         |     |            |
| verify_expires_at | dateTime  | yes  |         |     |            |
| verified          | boolean   | no   | false   |     |            |

### apa_cities

| Field        | Type      | Null | Default | Key | References |
| ------------ | --------- | ---- | ------- | --- | ---------- |
| id           | uuid      | no   |         | PK  |            |
| date_created | timestamp | yes  |         |     |            |
| name         | string    | no   |         |     |            |
| slug         | string    | no   |         | UK  |            |
| latitude     | decimal   | no   |         |     |            |
| active       | boolean   | yes  | true    |     |            |
| longitude    | decimal   | yes  |         |     |            |

### apa_login_codes

| Field        | Type      | Null | Default | Key | References   |
| ------------ | --------- | ---- | ------- | --- | ------------ |
| id           | uuid      | no   |         | PK  |              |
| date_created | timestamp | yes  |         |     |              |
| user         | uuid      | no   |         | FK  | apa_users.id |
| code_hash    | string    | no   |         |     |              |
| expires_at   | dateTime  | no   |         |     |              |
| used_at      | dateTime  | yes  |         |     |              |
| attempts     | integer   | no   | 0       |     |              |

### apa_measurements

| Field          | Type      | Null | Default | Key | References             |
| -------------- | --------- | ---- | ------- | --- | ---------------------- |
| id             | uuid      | no   |         | PK  |                        |
| date_created   | timestamp | no   |         |     |                        |
| sampling_point | uuid      | no   |         | FK  | apa_sampling_points.id |
| tube           | uuid      | no   |         | FK  | apa_tubes.id           |
| date           | dateTime  | no   |         |     |                        |
| value          | decimal   | yes  |         |     |                        |

### apa_sampling_points

| Field        | Type      | Null | Default | Key | References    |
| ------------ | --------- | ---- | ------- | --- | ------------- |
| id           | uuid      | no   |         | PK  |               |
| date_created | timestamp | no   |         |     |               |
| date_updated | timestamp | yes  |         |     |               |
| point_number | integer   | no   |         |     |               |
| location     | string    | no   |         | UK  |               |
| description  | text      | no   |         |     |               |
| latitude     | decimal   | no   |         |     |               |
| longitude    | decimal   | no   |         |     |               |
| start_date   | dateTime  | no   |         |     |               |
| active       | boolean   | no   | true    |     |               |
| city         | uuid      | no   |         | FK  | apa_cities.id |

### apa_sessions

| Field        | Type      | Null | Default | Key | References   |
| ------------ | --------- | ---- | ------- | --- | ------------ |
| id           | uuid      | no   |         | PK  |              |
| date_created | timestamp | yes  |         |     |              |
| token        | string    | no   |         | UK  |              |
| user         | uuid      | no   |         | FK  | apa_users.id |
| last_seen_at | dateTime  | yes  |         |     |              |
| expires_at   | dateTime  | no   |         |     |              |

### apa_tubes

| Field        | Type      | Null | Default | Key | References    |
| ------------ | --------- | ---- | ------- | --- | ------------- |
| id           | uuid      | no   |         | PK  |               |
| date_created | timestamp | no   |         |     |               |
| code         | string    | no   |         |     |               |
| active       | boolean   | no   | true    |     |               |
| notes        | text      | yes  |         |     |               |
| city         | uuid      | no   |         | FK  | apa_cities.id |

### apa_users

| Field         | Type      | Null | Default | Key | References |
| ------------- | --------- | ---- | ------- | --- | ---------- |
| id            | uuid      | no   |         | PK  |            |
| date_created  | timestamp | yes  |         |     |            |
| date_updated  | timestamp | yes  |         |     |            |
| email         | string    | no   |         | UK  |            |
| email_lower   | string    | no   |         | UK  |            |
| active        | boolean   | no   |         |     |            |
| last_login_at | dateTime  | yes  |         |     |            |
| role          | string    | no   |         |     |            |
