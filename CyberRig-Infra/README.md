# CyberRig Infrastructure & Operations Guide

Tài liệu hướng dẫn vận hành hạ tầng Docker, Nginx Gateway và môi trường container hóa cho hệ sinh thái CyberRig.

---

## 1. Cấu Trúc Thành Phần Hạ Tầng

```text
CyberRig-Infra/
├── nginx/
│   └── nginx.conf                         # Reverse proxy: X-Correlation-ID, /api/monitoring/stream unbuffered SSE
├── kong/
│   └── kong.yml                           # Reference DB-less Kong Gateway (rate-limit, correlation-id, CORS)
├── rabbitmq/
│   ├── rabbitmq.conf                      # Broker AMQP + Management definitions bootstrap
│   └── definitions.json                   # Exchange cyberrig.orders, DLX cyberrig.dlx & cyberrig.orders.dlq
├── docker/
│   ├── docker-compose.prod.yml            # Stack 4 containers Production
│   ├── docker-compose.dev.yml             # Stack PostgreSQL & Redis môi trường phát triển
│   ├── docker-compose.integration.yml     # Overlay SE445 RabbitMQ 3.13 + Kong 3.6
│   └── .env.example                       # Biến môi trường mẫu
└── README.md
```

---

## 2. Các Lệnh Điều Hành Chính

### Khởi động môi trường Production:
```bash
docker compose -f CyberRig-Infra/docker/docker-compose.prod.yml up -d
```

### Khởi động môi trường Development (Postgres 5433 & Redis 6380):
```bash
docker compose -f CyberRig-Infra/docker/docker-compose.dev.yml up -d
```

### Kiểm tra sức khỏe toàn bộ Containers:
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```
