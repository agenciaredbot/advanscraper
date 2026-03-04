# Guia de Integracion con AdvanScraper

> Documento de referencia para conectar otros modulos del ecosistema con AdvanScraper.
> Ultima actualizacion: 2026-02-26

---

## 1. Resumen de Arquitectura

AdvanScraper expone sus capacidades a traves de **dos canales**:

```
┌──────────────────────────────────────────────────────────────┐
│                     ADVANSCRAPER                             │
│                                                              │
│   ┌──────────────────────────────────────────────────────┐   │
│   │              Services Layer                          │   │
│   │         (toda la logica de negocio)                   │   │
│   └──────────────┬───────────────────┬───────────────────┘   │
│                  │                   │                        │
│   ┌──────────────▼──────┐  ┌────────▼────────────────┐      │
│   │   API REST v1       │  │   MCP Server (stdio)     │      │
│   │   /api/v1/...       │  │   30 tools               │      │
│   │   HTTP + JSON       │  │   agente-a-agente        │      │
│   │   Bearer ask_...    │  │   ADVANSCRAPER_API_KEY   │      │
│   └─────────────────────┘  └─────────────────────────┘      │
└──────────────────────────────────────────────────────────────┘
```

| Canal | Usar cuando... |
|---|---|
| **API REST v1** | Tu modulo hace llamadas HTTP directas (backends, scripts, webhooks, integraciones tipo Zapier) |
| **MCP Server** | Tu modulo es un agente de IA que necesita comunicacion agente-a-agente via Model Context Protocol |

Ambos canales consumen la misma Services Layer y usan el mismo sistema de autenticacion por API key.

---

## 2. Autenticacion

### 2.1 Obtener una API Key

1. Entra a AdvanScraper → **Settings** → seccion **API Publica**
2. Click en **"Nueva Key"** → dale un nombre descriptivo (ej: "Modulo CRM", "Agente IA")
3. Copia la key generada (**se muestra una sola vez**)

La key tiene el formato:

```
ask_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2
```

- Prefijo `ask_` (AdvanScraper Key) seguido de 64 caracteres hexadecimales
- Se almacena como hash SHA-256 en la base de datos (nunca en texto plano)
- Se puede revocar desde Settings en cualquier momento

### 2.2 Usar la API Key (REST)

Enviar en el header `Authorization` de cada request:

```
Authorization: Bearer ask_tu_key_aqui
```

### 2.3 Usar la API Key (MCP)

Pasar como variable de entorno:

```bash
ADVANSCRAPER_API_KEY=ask_tu_key_aqui npm run mcp
```

---

## 3. API REST v1

### 3.1 URL Base

```
https://TU_DOMINIO/api/v1
```

En desarrollo local: `http://localhost:3000/api/v1`

### 3.2 Formato de Respuestas

**Respuesta exitosa:**

```json
{
  "data": { ... },
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

**Respuesta de error:**

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Lead no encontrado"
  }
}
```

**Codigos de error posibles:**

| Codigo | HTTP | Descripcion |
|---|---|---|
| `UNAUTHORIZED` | 401 | API key invalida, ausente o expirada |
| `RATE_LIMITED` | 429 | Limite de solicitudes excedido |
| `VALIDATION_ERROR` | 400 | Datos de entrada invalidos |
| `NOT_FOUND` | 404 | Recurso no encontrado |
| `CONFLICT` | 409 | Conflicto (ej: tag duplicado) |
| `CONFIGURATION_ERROR` | 400 | Falta configuracion (ej: API key de Anthropic) |
| `FORBIDDEN` | 403 | Sin permiso para esta operacion |
| `INTERNAL_ERROR` | 500 | Error interno del servidor |

### 3.3 Rate Limiting

Las respuestas incluyen headers de rate limit:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 58
X-RateLimit-Reset: 45
```

| Categoria | Limite | Endpoints afectados |
|---|---|---|
| `general` | 60 req/min | Todos los endpoints por defecto |
| `scraping` | 10 req/min | `POST /scraping`, `GET /scraping/[searchId]` |
| `ai` | 30 req/min | `POST /ai/messages`, `POST /ai/messages/bulk` |
| `campaigns` | 5 req/min | Todos los de `/campaigns/...` |

### 3.4 Referencia Completa de Endpoints

#### Health Check

```
GET /api/v1/health
```

Respuesta: `{ "status": "ok", "version": "v1", "timestamp": "..." }`
No requiere autenticacion.

---

#### API Keys (auto-gestion)

```
GET  /api/v1/api-keys          → Listar tus API keys
POST /api/v1/api-keys          → Crear nueva key   { "name": "Mi App" }
DELETE /api/v1/api-keys/[id]   → Revocar key
```

---

#### Leads

```
GET    /api/v1/leads                → Listar leads (con filtros y paginacion)
POST   /api/v1/leads                → Crear lead(s)
GET    /api/v1/leads/[id]           → Detalle de un lead
PATCH  /api/v1/leads/[id]           → Actualizar lead
DELETE /api/v1/leads/[id]           → Eliminar lead
POST   /api/v1/leads/[id]/tags      → Asignar tags
DELETE /api/v1/leads/[id]/tags      → Quitar tags
GET    /api/v1/leads/[id]/notes     → Listar notas
POST   /api/v1/leads/[id]/notes     → Crear nota
```

**GET /leads — Parametros de query:**

| Parametro | Tipo | Descripcion |
|---|---|---|
| `source` | string | Filtrar por fuente: `google_maps`, `linkedin`, `instagram`, `facebook` |
| `city` | string | Filtrar por ciudad |
| `hasEmail` | boolean | Solo leads con email (`true`) |
| `hasPhone` | boolean | Solo leads con telefono (`true`) |
| `search` | string | Busqueda full-text (nombre, negocio, email, etc.) |
| `searchId` | string | Filtrar por ID de busqueda/scrape |
| `isSaved` | boolean | Solo leads guardados/no guardados |
| `tagId` | string | Filtrar por tag |
| `page` | number | Pagina (default: 1) |
| `limit` | number | Resultados por pagina (default: 20, max: 100) |

**POST /leads — Crear un lead:**

```json
{
  "businessName": "Restaurante El Buen Sabor",
  "contactPerson": "Juan Perez",
  "firstName": "Juan",
  "lastName": "Perez",
  "email": "juan@buensabor.com",
  "phone": "+57 300 123 4567",
  "website": "https://buensabor.com",
  "city": "Bogota",
  "state": "Cundinamarca",
  "country": "Colombia",
  "industry": "Restaurantes",
  "source": "manual"
}
```

**POST /leads — Crear leads en bulk:**

```json
{
  "leads": [
    { "businessName": "...", "email": "..." },
    { "businessName": "...", "email": "..." }
  ]
}
```

Respuesta bulk: `{ "data": { "created": 8, "skipped": 2, "total": 10, "message": "..." } }`

**PATCH /leads/[id]:**

Enviar solo los campos que quieres actualizar. Campos enviados como `null` se borran.

**POST /leads/[id]/tags:**

```json
{
  "tagIds": ["uuid-tag-1", "uuid-tag-2"]
}
```

O para crear un tag nuevo y asignarlo:

```json
{
  "tagName": "VIP",
  "color": "#EF4444"
}
```

**DELETE /leads/[id]/tags:**

```json
{
  "tagIds": ["uuid-tag-1"]
}
```

---

#### Scraping

```
POST /api/v1/scraping              → Iniciar scrape
GET  /api/v1/scraping/[searchId]   → Verificar estado
```

**POST /scraping — Iniciar scrape:**

```json
{
  "source": "google_maps",
  "query": "restaurantes en Bogota",
  "location": "Bogota, Colombia",
  "maxResults": 50
}
```

Fuentes soportadas: `google_maps`, `linkedin`, `instagram`, `facebook`

Para Instagram/Facebook con usernames:

```json
{
  "source": "instagram",
  "query": "perfiles",
  "usernames": ["usuario1", "usuario2"]
}
```

Respuesta (202 Accepted):

```json
{
  "data": {
    "searchId": "uuid-de-busqueda",
    "status": "running",
    "message": "Scraping iniciado..."
  }
}
```

**GET /scraping/[searchId] — Verificar estado:**

```json
{
  "data": {
    "status": "running",
    "phase": "scraping",
    "count": 25,
    "progress": {
      "itemCount": 25,
      "durationSecs": 45
    }
  }
}
```

Estados posibles: `running`, `completed`, `failed`
Fases: `scraping` → `enriching_facebook` → `enriching_emails` → completado

---

#### AI (Generacion de Mensajes)

```
POST /api/v1/ai/messages       → Generar un mensaje
POST /api/v1/ai/messages/bulk  → Generar mensajes en batch
```

**POST /ai/messages:**

```json
{
  "channel": "email",
  "lead": {
    "businessName": "Restaurante El Buen Sabor",
    "contactPerson": "Juan Perez",
    "industry": "Restaurantes",
    "city": "Bogota"
  },
  "templateBase": "Texto base opcional para personalizar...",
  "instructions": "Tono profesional pero cercano, en espanol"
}
```

Canales: `email`, `whatsapp`, `linkedin`, `instagram`

Respuesta:

```json
{
  "data": {
    "subject": "Propuesta para El Buen Sabor",
    "message": "Hola Juan, ...",
    "channel": "email"
  }
}
```

**POST /ai/messages/bulk:**

```json
{
  "channel": "whatsapp",
  "leads": [
    { "businessName": "...", "contactPerson": "..." },
    { "businessName": "...", "contactPerson": "..." }
  ],
  "instructions": "Mensaje corto y directo"
}
```

> Requiere API key de Anthropic configurada en Settings o en `.env` (`ANTHROPIC_API_KEY`).

---

#### Campaigns

```
GET    /api/v1/campaigns             → Listar campanas
POST   /api/v1/campaigns             → Crear campana
GET    /api/v1/campaigns/[id]        → Detalle de campana
DELETE /api/v1/campaigns/[id]        → Eliminar campana
POST   /api/v1/campaigns/[id]/send   → Enviar campana
```

**POST /campaigns:**

```json
{
  "name": "Campana Restaurantes Bogota",
  "channel": "email",
  "templateId": "uuid-template",
  "leadIds": ["uuid-lead-1", "uuid-lead-2"],
  "useAI": true,
  "aiInstructions": "Personaliza cada mensaje"
}
```

Alternativa: usar `listId` en lugar de `leadIds` para jalar leads de una lista.

**POST /campaigns/[id]/send:**

No requiere body. Inicia el envio en background.

```json
{
  "data": {
    "success": true,
    "message": "Campana iniciada. Revisa el progreso en el dashboard de campana."
  }
}
```

> Actualmente solo soporta envio automatico por `email` (requiere Brevo API key).

---

#### Templates

```
GET    /api/v1/templates        → Listar templates
POST   /api/v1/templates        → Crear template
GET    /api/v1/templates/[id]   → Detalle
PATCH  /api/v1/templates/[id]   → Actualizar
DELETE /api/v1/templates/[id]   → Eliminar
```

**POST /templates:**

```json
{
  "name": "Email de presentacion",
  "channel": "email",
  "subject": "Propuesta para {{businessName}}",
  "bodyLong": "Hola {{contactPerson}}, ...",
  "bodyShort": "Version corta para preview",
  "useAI": false
}
```

---

#### Lists (Listas de Leads)

```
GET    /api/v1/lists               → Listar listas
POST   /api/v1/lists               → Crear lista
GET    /api/v1/lists/[id]          → Detalle con leads
PATCH  /api/v1/lists/[id]          → Actualizar lista
DELETE /api/v1/lists/[id]          → Eliminar lista
POST   /api/v1/lists/[id]/leads    → Agregar leads a lista
DELETE /api/v1/lists/[id]/leads    → Quitar leads de lista
```

**POST /lists:**

```json
{
  "name": "Restaurantes Premium",
  "description": "Leads de restaurantes de alta gama",
  "color": "#3B82F6"
}
```

**POST /lists/[id]/leads:**

```json
{
  "leadIds": ["uuid-lead-1", "uuid-lead-2"]
}
```

---

#### Tags

```
GET    /api/v1/tags        → Listar tags (con conteo de uso)
POST   /api/v1/tags        → Crear tag
DELETE /api/v1/tags/[id]   → Eliminar tag
```

**POST /tags:**

```json
{
  "name": "VIP",
  "color": "#10B981"
}
```

---

#### Outreach (Historial)

```
GET /api/v1/outreach   → Historial de outreach
```

**Parametros de query:** `channel`, `page`, `limit`

---

#### Exports

```
POST /api/v1/exports/csv   → Exportar leads a CSV
```

**Body:**

```json
{
  "leadIds": ["uuid-1", "uuid-2"],
  "source": "google_maps",
  "searchId": "uuid-busqueda"
}
```

Todos los campos son opcionales. Sin filtros exporta todos los leads.

Respuesta: archivo CSV como `text/csv` (no JSON).

---

#### Stats

```
GET /api/v1/stats   → Estadisticas del dashboard
```

Respuesta:

```json
{
  "data": {
    "totalLeads": 1250,
    "leadsToday": 45,
    "searchesToday": 3,
    "activeCampaigns": 2,
    "messagesSent": 380,
    "recentSearches": [...],
    "recentCampaigns": [...],
    "leadsBySource": [
      { "source": "google_maps", "count": 800 },
      { "source": "linkedin", "count": 300 }
    ]
  }
}
```

---

## 4. MCP Server (Agente-a-Agente)

### 4.1 Que es

El MCP Server expone las mismas capacidades de AdvanScraper como **tools** del protocolo Model Context Protocol. Esto permite que un agente de IA se conecte y use todas las funciones de AdvanScraper de forma autonoma.

### 4.2 Iniciar el servidor

```bash
# Desde el directorio de AdvanScraper
ADVANSCRAPER_API_KEY=ask_tu_key_aqui npm run mcp
```

El servidor usa transporte **stdio** (entrada/salida estandar).

### 4.3 Configurar en Claude Desktop / otro cliente MCP

En el archivo de configuracion MCP del cliente (ej: `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "advanscraper": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/ruta/a/advanscraper",
      "env": {
        "ADVANSCRAPER_API_KEY": "ask_tu_key_aqui"
      }
    }
  }
}
```

O usando `tsx` directamente:

```json
{
  "mcpServers": {
    "advanscraper": {
      "command": "npx",
      "args": ["tsx", "src/mcp/server.ts"],
      "cwd": "/ruta/a/advanscraper",
      "env": {
        "ADVANSCRAPER_API_KEY": "ask_tu_key_aqui"
      }
    }
  }
}
```

### 4.4 Tools disponibles (30 tools)

| Tool | Descripcion |
|---|---|
| **Leads** | |
| `advanscraper_search_leads` | Buscar y filtrar leads con paginacion |
| `advanscraper_get_lead` | Detalle de un lead por ID |
| `advanscraper_create_lead` | Crear lead manual |
| `advanscraper_import_leads` | Importar leads en batch |
| `advanscraper_update_lead` | Actualizar campos de un lead |
| `advanscraper_delete_lead` | Eliminar lead |
| `advanscraper_save_leads` | Marcar leads como guardados |
| `advanscraper_unsave_leads` | Desmarcar leads guardados |
| `advanscraper_list_notes` | Ver notas de un lead |
| `advanscraper_create_note` | Agregar nota a un lead |
| `advanscraper_assign_tag` | Asignar tags a un lead |
| `advanscraper_remove_tag` | Quitar tags de un lead |
| **Scraping** | |
| `advanscraper_scrape_leads` | Iniciar scrape (Google Maps, LinkedIn, Instagram, Facebook) |
| `advanscraper_check_scrape_status` | Verificar estado de un scrape |
| **AI** | |
| `advanscraper_generate_message` | Generar mensaje personalizado con IA |
| `advanscraper_generate_messages_bulk` | Generar mensajes en batch |
| **Campaigns** | |
| `advanscraper_list_campaigns` | Listar campanas |
| `advanscraper_get_campaign` | Detalle de campana |
| `advanscraper_create_campaign` | Crear campana |
| `advanscraper_delete_campaign` | Eliminar campana |
| `advanscraper_send_campaign` | Enviar campana |
| **Templates** | |
| `advanscraper_list_templates` | Listar templates |
| `advanscraper_get_template` | Detalle de template |
| `advanscraper_create_template` | Crear template |
| `advanscraper_update_template` | Actualizar template |
| `advanscraper_delete_template` | Eliminar template |
| **Lists** | |
| `advanscraper_list_lists` | Listar listas de leads |
| `advanscraper_get_list` | Detalle de lista con leads |
| `advanscraper_create_list` | Crear lista |
| `advanscraper_update_list` | Actualizar lista |
| `advanscraper_delete_list` | Eliminar lista |
| `advanscraper_add_leads_to_list` | Agregar leads a lista |
| `advanscraper_remove_leads_from_list` | Quitar leads de lista |
| **Tags** | |
| `advanscraper_list_tags` | Listar tags con conteo |
| `advanscraper_create_tag` | Crear tag |
| `advanscraper_delete_tag` | Eliminar tag |
| **Outreach & Exports** | |
| `advanscraper_send_email` | Enviar email a un lead |
| `advanscraper_outreach_history` | Historial de outreach |
| `advanscraper_export_leads_csv` | Exportar leads a CSV |
| **Stats** | |
| `advanscraper_get_stats` | Estadisticas del dashboard |

---

## 5. Ejemplos de Integracion

### 5.1 Desde otro backend (Node.js / Python / cualquier lenguaje)

```typescript
// Node.js / TypeScript
const API_KEY = process.env.ADVANSCRAPER_API_KEY;
const BASE_URL = "https://tu-dominio.com/api/v1";

// Buscar leads de restaurantes en Bogota
const res = await fetch(`${BASE_URL}/leads?city=Bogota&source=google_maps&limit=50`, {
  headers: { "Authorization": `Bearer ${API_KEY}` }
});
const { data, meta } = await res.json();
console.log(`Encontrados ${meta.pagination.total} leads`);

// Crear un lead
const newLead = await fetch(`${BASE_URL}/leads`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${API_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    businessName: "Mi Negocio",
    email: "contacto@minegocio.com",
    city: "Medellin",
    source: "crm_import"
  })
});

// Iniciar scrape y esperar resultados
const scrape = await fetch(`${BASE_URL}/scraping`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${API_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    source: "google_maps",
    query: "hoteles en Cartagena",
    maxResults: 100
  })
});
const { data: { searchId } } = await scrape.json();

// Polling del estado
let status = "running";
while (status === "running") {
  await new Promise(r => setTimeout(r, 5000)); // Esperar 5s
  const check = await fetch(`${BASE_URL}/scraping/${searchId}`, {
    headers: { "Authorization": `Bearer ${API_KEY}` }
  });
  const result = await check.json();
  status = result.data.status;
  console.log(`Estado: ${status}, Leads encontrados: ${result.data.count || 0}`);
}
```

```python
# Python
import requests
import time

API_KEY = "ask_tu_key_aqui"
BASE_URL = "https://tu-dominio.com/api/v1"
headers = {"Authorization": f"Bearer {API_KEY}"}

# Buscar leads
res = requests.get(f"{BASE_URL}/leads", headers=headers, params={
    "city": "Bogota",
    "hasEmail": "true",
    "limit": 50
})
leads = res.json()["data"]

# Generar mensaje con IA para el primer lead
lead = leads[0]
msg = requests.post(f"{BASE_URL}/ai/messages", headers=headers, json={
    "channel": "email",
    "lead": {
        "businessName": lead["businessName"],
        "contactPerson": lead["contactPerson"],
        "industry": lead["industry"],
        "city": lead["city"]
    },
    "instructions": "Tono profesional, en espanol, maximo 150 palabras"
})
message = msg.json()["data"]
print(f"Asunto: {message['subject']}")
print(f"Mensaje: {message['message']}")
```

### 5.2 Desde un agente de IA (via MCP)

Un agente conectado al MCP Server puede hacer cosas como:

```
Usuario: "Busca 50 restaurantes en Medellin, crea una lista llamada
         'Restaurantes Medellin' y genera un email personalizado para
         los primeros 5"

El agente ejecuta:
1. advanscraper_scrape_leads(source="google_maps", query="restaurantes en Medellin", maxResults=50)
2. advanscraper_check_scrape_status(searchId="...") — polling hasta completar
3. advanscraper_create_list(name="Restaurantes Medellin")
4. advanscraper_search_leads(searchId="...", limit=50)
5. advanscraper_add_leads_to_list(listId="...", leadIds=[...])
6. Para cada uno de los primeros 5 leads:
   advanscraper_generate_message(channel="email", lead={...}, instructions="...")
```

### 5.3 Flujo tipico de integracion entre modulos

```
Modulo CRM                     AdvanScraper
    │                               │
    │  POST /api/v1/scraping        │
    │  (scrape restaurantes)        │
    ├──────────────────────────────►│
    │                               │  Inicia scraping async
    │  GET /scraping/[searchId]     │
    ├──────────────────────────────►│  (polling cada 5-10s)
    │  ◄─── status: completed ─────│
    │                               │
    │  GET /api/v1/leads            │
    │  ?searchId=xxx&hasEmail=true  │
    ├──────────────────────────────►│
    │  ◄─── leads con email ───────│
    │                               │
    │  POST /api/v1/ai/messages     │
    │  (generar mensaje para lead)  │
    ├──────────────────────────────►│
    │  ◄─── mensaje generado ──────│
    │                               │
    │  (el CRM envia el mensaje     │
    │   por su propio canal)        │
    │                               │
```

---

## 6. Variables de Entorno Relevantes

AdvanScraper necesita estas variables configuradas en su `.env.local`:

| Variable | Requerida | Descripcion |
|---|---|---|
| `DATABASE_URL` | Si | URL de PostgreSQL (Supabase) |
| `NEXT_PUBLIC_SUPABASE_URL` | Si | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Si | Key publica de Supabase |
| `ANTHROPIC_API_KEY` | Para IA | Key de Anthropic (genera mensajes) |
| `BREVO_API_KEY` | Para email | Key de Brevo (envia emails) |
| `BREVO_SENDER_EMAIL` | Para email | Email del remitente |
| `BREVO_SENDER_NAME` | Para email | Nombre del remitente |
| `APIFY_API_TOKEN` | Para scraping | Token de Apify (scraping avanzado) |

Para el **MCP Server**, ademas necesita:

| Variable | Requerida | Descripcion |
|---|---|---|
| `ADVANSCRAPER_API_KEY` | Si | API key generada desde Settings |

---

## 7. Stack Tecnico

| Componente | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) |
| Lenguaje | TypeScript |
| ORM | Prisma 7 con `@prisma/adapter-pg` |
| Base de datos | PostgreSQL (Supabase) |
| Auth interna | Supabase Auth (sesiones/cookies) |
| Auth API | API keys con hash SHA-256 |
| MCP | `@modelcontextprotocol/sdk` v1.27.1 |
| AI | Anthropic Claude (via `@anthropic-ai/sdk`) |
| Email | Brevo (via `@getbrevo/brevo`) |
| Scraping | Apify (via `apify-client`) |
| UI | Tailwind CSS + shadcn/ui |

---

## 8. Notas para Desarrolladores de Otros Modulos

1. **Siempre usa API keys**, nunca intentes autenticarte con sesion de Supabase desde otro modulo. Las sesiones son solo para la UI web de AdvanScraper.

2. **Scraping es asincrono.** `POST /scraping` retorna inmediatamente con un `searchId`. Debes hacer polling a `GET /scraping/[searchId]` cada 5-10 segundos hasta que `status` sea `completed` o `failed`.

3. **Generacion de IA requiere API key de Anthropic.** El usuario debe configurarla en Settings o debe existir `ANTHROPIC_API_KEY` en el `.env`.

4. **Envio de email requiere Brevo.** El usuario debe configurar su API key de Brevo.

5. **Rate limiting es por usuario, no por API key.** Si tienes multiples API keys del mismo usuario, comparten el mismo limite.

6. **El CSV export devuelve `text/csv`, no JSON.** Es el unico endpoint que no retorna JSON.

7. **Todos los IDs son UUID v4.** Formato: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

8. **Los datos son scoped por usuario.** Una API key solo puede acceder a los datos del usuario que la creo. No hay acceso cross-user.

9. **MCP Server y API REST son intercambiables.** Ambos llaman la misma logica. Si algo funciona por API, funciona por MCP y viceversa.

10. **Para conectar desde otro agente MCP**, agrega el servidor a la configuracion MCP del cliente con `command: "npm"`, `args: ["run", "mcp"]`, y el `ADVANSCRAPER_API_KEY` en `env`.
