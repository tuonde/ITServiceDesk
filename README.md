# IT Service Desk

[![CI](https://github.com/tuonde/ITServiceDesk/actions/workflows/ci.yml/badge.svg)](https://github.com/tuonde/ITServiceDesk/actions/workflows/ci.yml)

## Genel Bakış

**IT Service Desk**, kurumsal teknik destek süreçlerini ve arıza bildirimlerini yönetmek için tasarlanmış modern, çok katmanlı ve rol tabanlı bir servis yönetim (ITSM) web uygulamasıdır. 

Sistem; çalışanların donanım/yazılım arızalarını bildirebilmelerini, teknisyenlerin kendilerine atanan talepleri çözüme kavuşturabilmelerini ve yöneticilerin (Admin) tüm servis operasyonlarını, cihaz envanterini, SLA takibini, sistem ayarlarını ve denetim kayıtlarını merkezi olarak yönetebilmelerini sağlar.

---

## Ekran Görüntüleri

### Admin Dashboard
![Admin Dashboard](docs/screenshots/admin-dashboard.png)

### Ticket Yönetimi
![Ticket Yönetimi](docs/screenshots/admin-tickets.png)

### Knowledge Base Yönetimi
![Knowledge Base Yönetimi](docs/screenshots/admin-knowledge-base.png)

### Teknisyen Görevleri
![Teknisyen Görevleri](docs/screenshots/technician-my-tasks.png)

### Zimmetlerim (Kullanıcı Envanteri)
![Zimmetlerim](docs/screenshots/user-my-inventory.png)

### Yardım Merkezi
![Yardım Merkezi](docs/screenshots/help-center.png)

---

## Temel Özellikler

| Modül | Açıklama |
|---|---|
| **Ticket Yönetimi** | Öncelik, kategori, atama (assignee), durum akışları, yorumlaşma, dosya ekleme (attachment), talebi yeniden açma (reopen) ve çözüm geçmişi. |
| **Rol Tabanlı Erişim** | Admin, Technician ve User rolleri; ASP.NET Identity ve claim/resource-based yetkilendirme altyapısı. |
| **Envanter & Zimmet** | Donanım/cihaz tanımlama, personele cihaz zimmetleme, cihaz bazlı arıza geçmişi ve bilet-envanter entegrasyonu. |
| **Canlı Bildirimler** | SignalR entegrasyonu ile anlık durum güncellemeleri ve kalıcı veritabanı bildirimleri. |
| **Knowledge Base** | Kategori hiyerarşisi, zengin metin (HTML) makaleler, rol bazlı makale görünürlüğü ve personel yardım merkezi. |
| **SLA & Eskalasyon** | Öncelik bazlı SLA yanıt/çözüm süreleri takibi, arkaplan çalışanı (Background Worker) ile otomatik SLA ihlal denetimi. |
| **Raporlama & Audit** | Dashboard KPI metrikleri, teknisyen performans analizi, kategori dağılımları ve detaylı işlem denetim günlükleri (AuditLog). |
| **Sistem Ayarları** | Güvenlik politikaları, dosya yükleme limitleri, SLA yapılandırması ve dinamik logo/tema yönetimi. |

---

## Kullanıcı Rolleri

| Rol | Temel Yetki ve Kapsam |
|---|---|
| **User (Kullanıcı)** | Kendi arıza bildirimlerini oluşturma ve takip etme, yorum/dosya ekleme, kapalı talebi yeniden açma, zimmetli cihazlarını listeleme ve yardım merkezinden yararlanma. |
| **Technician (Teknisyen)** | Kendisine atanmış veya havuzdaki talepleri üstlenme, durum güncelleme (In Progress, Resolved vb.), teknik yorum ve ek yükleme, zimmet detaylarını inceleme. |
| **Admin (Yönetici)** | Tüm bilet operasyonlarını yönetme, kullanıcı/departman/envanter yönetimi, sistem genel ayarları, SLA parametreleri, raporlar, KB yönetimi ve Audit Log inceleme. |

---

## Kullanılan Teknolojiler

- **Backend:**
  - .NET 8 (C#) & ASP.NET Core Web API
  - Entity Framework Core 8
  - Microsoft SQL Server
  - ASP.NET Core Identity & JWT Authentication
  - SignalR (Real-time communication)
  - AutoMapper, FluentValidation
  - Serilog (Yapılandırılmış Console Loglama)

- **Frontend:**
  - React 19 & TypeScript
  - Vite
  - Tailwind CSS
  - Axios, React Router, Recharts
  - Lucide Icons, DOMPurify

- **Test Altyapısı:**
  - **xUnit & Moq:** Backend birim testleri (Unit Tests)
  - **WebApplicationFactory & Testcontainers:** Gerçek SQL Server ile API entegrasyon testleri (Integration Tests)
  - **Vitest & React Testing Library:** Frontend bileşen ve entegrasyon testleri
  - **Playwright:** Gerçek tarayıcı, API ve veritabanı üzerinde çalışan uçtan uca testler (E2E Tests)

- **Altyapı & Dağıtım:**
  - Docker & Docker Compose
  - Nginx (Reverse Proxy, Static Hosting, Security Headers)
  - GitHub Actions (CI Pipeline)

---

## Mimari ve Çalışma Zamanı Topolojisi

Uygulama, sorumlulukların ayrıştırıldığı **Çok Katmanlı (N-Tier / Layered) Mimari** prensiplerine göre yapılandırılmıştır:

- **`ITServiceDesk.Core`:** Varlık modelleri (Entities), enumlar, DTO sözleşmeleri ve temel arayüzler (Interfaces).
- **`ITServiceDesk.Data`:** `ITServiceDeskDbContext`, entity konfigürasyonları, EF Core migration'ları ve repository implementasyonları.
- **`ITServiceDesk.Service`:** Temel iş mantığı (Business Logic), validasyonlar, servis katmanı, SLA hesaplayıcıları ve arkaplan işçileri (Background Workers).
- **`ITServiceDesk.API`:** HTTP Controller uçları, middleware yapılandırmaları, SignalR hub'ları ve Dependency Injection tanımları.
- **`ITServiceDesk.Client`:** Nginx üzerinde statik olarak sunulan React/TypeScript Single Page Application (SPA).

### Docker Ağ ve Konteyner Topolojisi

```mermaid
flowchart TD
    subgraph Host["Host Makine"]
        Browser["Web Tarayıcısı / İstemci"]
    end

    subgraph DockerEnv["Docker Compose Ortamı"]
        subgraph ProxyNet["proxy-network (172.25.0.0/28)"]
            Frontend["Frontend (Nginx :80)"]
            API["Backend (ASP.NET Core API :8080)"]
        end

        subgraph DataNet["data-network (İzole Köprü Ağı)"]
            SQL["SQL Server 2022 (:1433)"]
        end
    end

    Browser -->|"HTTP :8080"| Frontend
    Frontend -->|"Statik Dosyalar & SPA Fallback"| Frontend
    Frontend -->|"Reverse Proxy /api/*"| API
    Frontend -->|"WebSockets /ticketHub & /notificationHub"| API
    API -->|"TCP / EF Core"| SQL

    classDef hostStyle fill:#f9f9f9,stroke:#333,stroke-width:2px;
    classDef proxyStyle fill:#e1f5fe,stroke:#0288d1,stroke-width:2px;
    classDef dataStyle fill:#ede7f6,stroke:#512da8,stroke-width:2px;
    
    class Host hostStyle;
    class ProxyNet proxyStyle;
    class DataNet dataStyle;
```

### İstek Akışı ve Ağ İzolasyonu
1. **İstemci Erişimi:** Host makineden dış dünyaya açık olan tek port `8080` (Frontend Nginx) portudur.
2. **Reverse Proxy:** Nginx, gelen `/api/*` isteklerini ve SignalR bağlantılarını iç ağ (`proxy-network`) üzerinden API konteynerine aktarır.
3. **Ağ İzolasyonu (Network Segmentation):**
   - `proxy-network`: Frontend ve API konteynerleri arasındaki haberleşmeyi sağlar.
   - `data-network`: Yalnızca API ve SQL Server konteynerleri arasındadır; Frontend konteynerinin SQL ağına doğrudan erişimi engellenmiştir.
   - SQL Server ve API portları host makineye publish edilmez (dışarıya kapalıdır).

---

## Veritabanı İlişki Şeması (ERD)

Aşağıdaki şema, sistemin temel domain varlıklarını, ilişkilerini ve kardinalitelerini göstermektedir:

```mermaid
erDiagram
    DEPARTMENT o|--o{ APP_USER : "has"
    DEPARTMENT o|--o{ TICKET : "assigned to"
    DEPARTMENT o|--o{ DEVICE : "located in"

    APP_USER ||--o{ TICKET : "creates (requester)"
    APP_USER o|--o{ TICKET : "assigned to (tech)"
    APP_USER o|--o{ DEVICE : "assigned to"
    APP_USER ||--o{ COMMENT : "writes"
    APP_USER ||--o{ NOTIFICATION : "receives"
    APP_USER o|--o{ AUDIT_LOG : "triggers"
    APP_USER ||--o{ KB_ARTICLE : "authors"
    APP_USER ||--o{ KB_ARTICLE_FEEDBACK : "submits"

    TICKET_CATEGORY o|--o{ TICKET : "categorizes"
    DEVICE_CATEGORY ||--o{ DEVICE : "classifies"
    DEVICE o|--o{ TICKET : "associated with"

    TICKET ||--o{ COMMENT : "contains"
    TICKET o|--o{ ATTACHMENT : "attached to"
    TICKET o|--o{ AUDIT_LOG : "tracks"
    TICKET o|--o{ NOTIFICATION : "references"

    COMMENT o|--o{ ATTACHMENT : "includes"

    KB_CATEGORY ||--o{ KB_ARTICLE : "groups"
    KB_ARTICLE ||--o{ KB_ARTICLE_FEEDBACK : "receives"
    KB_ARTICLE o|--o{ ATTACHMENT : "includes"

    APP_USER {
        Guid Id PK
        string FirstName
        string LastName
        string Email
        Guid DepartmentId FK
    }

    DEPARTMENT {
        Guid Id PK
        string Name
        string Description
    }

    TICKET {
        Guid Id PK
        string Title
        TicketStatus Status
        Priority Priority
        Guid RequesterId FK
        Guid AssigneeId FK
        Guid DepartmentId FK
        Guid CategoryId FK
        Guid DeviceId FK
    }

    TICKET_CATEGORY {
        Guid Id PK
        string Name
    }

    DEVICE {
        Guid Id PK
        string Code
        string Name
        DeviceStatus Status
        Guid CategoryId FK
        Guid DepartmentId FK
        Guid AssignedUserId FK
    }

    DEVICE_CATEGORY {
        Guid Id PK
        string Name
    }

    COMMENT {
        Guid Id PK
        Guid TicketId FK
        Guid UserId FK
        string Content
    }

    ATTACHMENT {
        Guid Id PK
        string FileName
        string FilePath
        Guid TicketId FK
        Guid CommentId FK
        Guid KbArticleId FK
    }

    NOTIFICATION {
        Guid Id PK
        Guid UserId FK
        Guid RelatedTicketId FK
        string Message
        bool IsRead
    }

    AUDIT_LOG {
        Guid Id PK
        Guid UserId FK
        Guid TicketId FK
        string Action
        string EntityId
    }

    KB_CATEGORY {
        Guid Id PK
        string Name
        string Description
    }

    KB_ARTICLE {
        Guid Id PK
        string Title
        Guid CategoryId FK
        Guid AuthorId FK
        int ViewCount
    }

    KB_ARTICLE_FEEDBACK {
        Guid Id PK
        Guid ArticleId FK
        Guid UserId FK
        bool IsHelpful
    }

    SYSTEM_SETTING {
        Guid Id PK
        string AppName
        int SlaCriticalResponseHours
        int SlaCriticalResolutionHours
    }
```

> [!NOTE]
> **Önemli Model Kısıtları:**
> - `KbArticleFeedback`: Kullanıcı başına makale bazında tek geri bildirim kısıtı (`UNIQUE (ArticleId, UserId)`).
> - `Ticket`: `RequesterId` zorunludur (`OnDelete: Restrict`); `AssigneeId`, `DepartmentId`, `CategoryId` ve `DeviceId` isteğe bağlıdır (nullable).
> - `Attachment`: `Ticket`, `Comment` veya `KbArticle` ile ilişkilendirilebilen nullable foreign key (çoklu opsiyonel FK) alanları içerir.


---

## Güvenlik Mimarisi

- **Kimlik Doğrulama & Yetkilendirme:** JWT tabanlı Token Authentication, Claim/Role bazlı Authorization ve kaynak bazlı yetki denetimi (BOLA/IDOR koruması).
- **Hız Sınırlaması (Rate Limiting):** Aşırı istek (request flooding) ve brute-force deneme risklerini sınırlandırmak amacıyla API genelinde fixed-window rate limiter aktiftir.
- **Güvenlik Başlıkları:** Nginx ve API seviyesinde `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` ve `Referrer-Policy: strict-origin-when-cross-origin` başlıkları zorunludur.
- **İçerik Güvenlik Politikası (CSP):** XSS risklerini sınırlandırmak ve kaynak yüklemelerini kısıtlamak amacıyla Nginx katmanında derinlemesine savunma (defense-in-depth) yaklaşımıyla Content Security Policy (`script-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`) uygulanmıştır.
- **Dosya Yükleme Koruması:**
  - **Taşıma Tavanı (Nginx):** `client_max_body_size 12M` (Nginx transport ceiling 12M olarak API business limitinin biraz üzerinde tutulur).
  - **İş Mantığı Sınırı (API):** Gerçek dosya boyutu kontrolü API seviyesinde maksimum 10 MB olarak doğrulanır ve sınırlandırılır.
  - **İçerik Doğrulama:** Yalnızca izin verilen uzantılar (.pdf, .png, .jpg, .jpeg, .docx, .xlsx, .txt) ve dosya başlığı/magic-byte doğrulaması ile kabul edilir.
- **Fail-Closed Secret Kontrolü:** Production ortamında güvenli bir `JWT_SECRET` tanımlanmadığı takdirde uygulama başlamayı reddeder.
- **Geliştirici İzolasyonu:** Swagger UI yalnızca Development ortamında aktiftir; Production modunda devre dışı bırakılır.

> [!NOTE]
> **Güvenlik Notları ve Kabul Edilen Sınırlamalar:**
> - JWT Token istemci tarafında `localStorage` üzerinde saklanmaktadır (kabul edilmiş teknik borç).
> - Yerel Docker Compose ortamı HTTP üzerinde çalışacak şekilde tasarlanmıştır. Gerçek canlı dağıtımda TLS (HTTPS) sonlandırması ve HSTS politikası en dıştaki ters vekil (Edge Proxy / Ingress) katmanında uygulanmalıdır.

---

## Sağlık İzleme ve Gözlemlenebilirlik (Health & Observability)

Sistem, konteyner orkestrasyonu ve çalışma zamanı sağlığı için iki ayrı health endpoint sunar:

- **`/health/live` (Liveness):** API sürecinin çalıştığını ve isteklere yanıt verebildiğini doğrular.
- **`/health/ready` (Readiness):** API'nin yapılandırılmış readiness kontrollerini çalıştırır (Mevcut durumda SQL Server / DbContext bağlantısının hazır olup olmadığı doğrulanmaktadır).

### Konteyner Sağlık Kontrolleri
- **SQL Server:** `sqlcmd` ile periyodik sorgulama.
- **API:** `curl` ile `/health/ready` uç noktasını sorgular; Compose başlangıcında API container'ı SQL Server healthcheck'inin healthy olmasını bekler (`depends_on.condition: service_healthy`).
- **Frontend:** `wget` ile Nginx servis durumunu sorgular; API hazır olmadan Frontend devreye girmez.

### Yapılandırılmış Loglama (Structured Logging)
- **Serilog:** Tüm loglar standart çıktıya (stdout/stderr) yapılandırılmış console çıktı formatında (`SourceContext`, `RequestId`, `ElapsedMilliseconds` özellikleri serialize edilerek) yazılır.
- **Request Logging:** HTTP istek tamamlama olayları tek satırda loglanır. Health check ve polling istekleri log gürültüsünü önlemek amacıyla filtrelenmiştir.

### Hassas Veri Loglama Politikası
- Kimlik doğrulama anahtarları (JWT Secret), kullanıcı/SA şifreleri ve `Authorization` başlıkları log çıktılarına dahil edilmez.

---

## Test Altyapısı ve Kalite Güvencesi

Projede **75** adet otomatikleştirilmiş test bulunmaktadır:

```text
[Toplam 75 Otomatik Test]
├── 24 Backend Unit Tests (xUnit + Moq)
├── 39 Backend API / SQL Integration Tests (Testcontainers MSSQL)
├── 10 Frontend Component Tests (Vitest + React Testing Library)
└──  2 E2E System Tests (Playwright - Gerçek Tarayıcı, API ve DB Akışı)
```

- **Entegrasyon Testleri:** Testcontainers ile geçici izole SQL Server konteyneri ayağa kaldırılarak gerçek migration ve sorgu doğrulaması yapılır.
- **E2E Testleri:** Mock kullanılmadan; kullanıcı girişi, bilet oluşturma, teknisyen ataması, çözme ve yeniden açma yaşam döngüsü uçtan uca test edilir.

### Test Komutları

**Backend Testleri:**
```powershell
dotnet test -c Release
```

**Frontend Testleri:**
```powershell
cd ITServiceDesk.Client
npm ci
npm run lint
npm run test:run
npm run build
```

**Uçtan Uca (E2E) Testleri:**
```powershell
cd ITServiceDesk.Client
npm run e2e
```

---

## Sürekli Entegrasyon (CI Pipeline)

GitHub Actions üzerinde çalışan CI iş akışı (`.github/workflows/ci.yml`); `main` ve `production-hardening` branch'lerine yapılan `push` işlemlerinde ve `main` branch'ine açılan `pull_request` işlemlerinde tetiklenir:

1. **Backend CI:** Bağımlılık geri yükleme, Release derleme ve xUnit Unit + Integration testlerini çalıştırır.
2. **Frontend CI:** ESLint denetimi, Vitest RTL testleri, Vite derlemesi ve bilgilendirme amaçlı `npm audit` çalıştırır.
3. **E2E CI:** Playwright tarayıcılarını kurarak izole SQL Server eşliğinde uçtan uca akış testlerini icra eder.

---

## Kurulum ve Çalıştırma

### 1. Docker Compose ile Hızlı Kurulum (Production-Like Ortam)

Projeyi tüm servisleri, ağ izolasyonları ve veritabanıyla birlikte izole konteynerlerde çalıştırmak için:

1. **Repository'yi Klonlayın:**
   ```bash
   git clone https://github.com/tuonde/ITServiceDesk.git
   cd ITServiceDesk
   ```

2. **Çevre Değişkenlerini Tanımlayın:**
   Örnek yapılandırma dosyasını `.env` olarak kopyalayın ve güçlü parolalar belirleyin:
   ```bash
   cp .env.example .env
   ```
   *(Windows PowerShell için: `copy .env.example .env`)*

   `.env` dosyasını açarak aşağıdaki değerleri tanımlayın:
   ```env
   SQL_SA_PASSWORD=SuperStrongPassword123!
   JWT_SECRET=Minimum32KarakterUzunlugundaCokGuvenliBirGizliAnahtar!
   ```

3. **Konteynerleri Başlatın:**
   ```bash
   docker compose up -d --build
   ```

4. **Uygulamaya Erişin:**
   Tarayıcınızdan `http://localhost:8080` adresine gidin.

---

### 2. İlk Yönetici (Bootstrap Admin) Hesabını Tanımlama

Production-like Docker Compose yapılandırmasında `DemoData` varsayılan olarak devre dışıdır ve ilk kayıt olan kullanıcılar daima standart `User` rolüyle kaydedilir. 

İlk `Admin` hesabını oluşturmak için `.env` dosyanızda şu değişkenleri açıp konteyneri başlatmanız yeterlidir:

```env
BOOTSTRAP_ADMIN_ENABLED=true
BOOTSTRAP_ADMIN_EMAIL=admin@sirketdomain.com
BOOTSTRAP_ADMIN_PASSWORD=CokGuvenliAdminParolasi123!
```

API başladığında bu hesabı otomatik olarak oluşturur (Idempotent). İlk yönetici başarıyla oluşturulduktan sonra güvenlik amacıyla `BOOTSTRAP_ADMIN_ENABLED=false` yapılması ve bootstrap admin parolasının ortam yapılandırmasından (`.env`) kaldırılması önerilir.

---

### 3. Yerel Geliştirme (Local Development)

Docker kullanmadan doğrudan yerel ortamda çalıştırmak için:

**Gereksinimler:** .NET 8 SDK, Node.js 24 önerilir (CI ortamında Node.js 24 kullanılmaktadır), SQL Server (LocalDB / Express)

1. **Veritabanı Migration'larını Uygulayın:**
   ```powershell
   dotnet ef database update --project ITServiceDesk.Data --startup-project ITServiceDesk.API
   ```

2. **Backend API'yi Başlatın:**
   ```powershell
   cd ITServiceDesk.API
   dotnet run
   ```
   *API `http://localhost:5014` adresinde çalışacaktır (Swagger: `http://localhost:5014/swagger`).*

3. **Frontend İstemcisini Başlatın:**
   ```powershell
   cd ITServiceDesk.Client
   npm ci
   npm run dev
   ```
   *Frontend `http://localhost:5173` adresinde çalışacaktır.*

#### Geliştirme Modu Demo Hesapları (Yalnızca Local Dev)
Development modunda `DemoData:Enabled=true` iken örnek verilerle birlikte şu hesaplar otomatik oluşturulur:
- **Admin:** `admin@itservicedesk.local` / `Demo12345!`
- **Technician:** `tech@itservicedesk.local` / `Demo12345!`
- **User:** `user@itservicedesk.local` / `Demo12345!`

---

## Kalıcı Veri Saklama (Persistence)

Docker ortamında iki adet adlandırılmış volume (named volume) kullanılır:
- **`sqlserver-data`:** SQL Server veritabanı dosyaları (`/var/opt/mssql`) için kalıcı disk alanı.
- **`api-uploads`:** Yüklenen bilet ekleri ve logo görselleri (`/app/App_Data/uploads`) için kalıcı disk alanı.

---

## Dağıtım Durumu (Deployment Scope)

Bu repository, **üretim standartlarına yakın (production-like) bir Docker Compose topolojisi** sunmaktadır. 

Aşağıdaki kurumsal altyapı bileşenleri bu projenin kapsamı dışındadır ve gerçek canlıya geçişte barındırma ortamı (Hosting Provider) tarafından sağlanmalıdır:
- Canlı TLS/SSL sertifika sağlama ve yönetimi (Let's Encrypt / Cloudflare)
- HSTS başlığının canlı proxy seviyesinde aktifleştirilmesi
- Yük Dengeleme (Load Balancing) ve Yüksek Erişilebilirlik (HA)
- Kubernetes / Bulut dağıtım manifestoları
- Otomatik veritabanı yedekleme ve felaket kurtarma (Disaster Recovery)

---

## Bilinen Teknik Sınırlamalar (Technical Debt)

- **JWT Depolama:** Access token'lar tarayıcıda `localStorage` üzerinde saklanmaktadır.
- **Kestrel HTTPS Uyarısı:** Yerel HTTP Docker Compose ortamında Kestrel'in verdiği `Failed to determine the https port for redirect.` log uyarısı (gerçek ortamda ters vekil TLS sonlandırması ile yönetilecektir).
- **ReactQuill CSP Kapsamı:** Zengin metin editörüne özgü uçtan uca izole CSP test kapsamı.
- **Frontend Lint Uyarıları:** `useEffect` hook'larında 7 adet eksik dependency uyarısı.
- **npm audit & Derleme Uyarıları:** Frontend paketlerine dair bilgilendirici denetim uyarıları ve backend nullable/async derleyici uyarıları.
- **SQL Server Sürümü:** SQL Server 2022 CU14 temel imajı periyodik güvenlik yaması takibi gerektirir.

---

## Proje Dizin Yapısı

```text
ITServiceDesk/
├── .github/
│   └── workflows/ci.yml       # GitHub Actions CI Tanımı
├── ITServiceDesk.API/         # ASP.NET Core Web API Sunucusu & Controller'lar
├── ITServiceDesk.Client/      # React & Vite Frontend Uygulaması
│   ├── nginx.conf             # Nginx Yapılandırması (CSP, Reverse Proxy, Headers)
│   └── tests/                 # RTL ve Playwright E2E Testleri
├── ITServiceDesk.Core/        # Domain Modelleri, DTO'lar ve Arayüzler
├── ITServiceDesk.Data/        # EF Core DbContext, Migration'lar ve Repository'ler
├── ITServiceDesk.Service/     # İş Mantığı, Servisler, SLA ve Validasyonlar
├── tests/
│   ├── ITServiceDesk.UnitTests/         # xUnit Birim Testleri
│   └── ITServiceDesk.IntegrationTests/  # Testcontainers API & SQL Entegrasyon Testleri
├── compose.yaml               # Üretim Benzeri Docker Compose Orkestrasyonu
└── .env.example               # Örnek Çevre Değişkenleri Şablonu
```
