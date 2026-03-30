**Prueba Técnica**

Backend Developer — NestJS Microservicio

_Versión 1.0 • Simplifud Engineering_

**1\. Descripción General**

Bienvenido/a al proceso de selección de Simplifud. Esta prueba evalúa tu capacidad para diseñar y desarrollar un microservicio backend con criterios de calidad de producción: arquitectura limpia, seguridad, patrones de diseño y buenas prácticas de código.

<div class="joplin-table-wrapper"><table><tbody><tr><td><p><strong>Stack Requerido</strong></p><ul><li>NestJS + TypeScript</li><li>PostgreSQL + Prisma ORM</li><li>JWT para autenticación</li><li>REST API</li></ul></td><td><p><strong>Condiciones</strong></p><ul><li>Duración: 5 días hábiles</li><li>Entrega: repositorio Git (GitHub / GitLab / Bitbucket)</li><li>Incluir README detallado</li><li>Pruebas unitarias valoradas</li></ul></td></tr></tbody></table></div>

**2\. Esquema de Base de Datos**

Se proporciona el siguiente schema de Prisma. El candidato debe importarlo tal como está y trabajar sobre él sin modificar la estructura de las tablas.

|     |
| --- |
| // schema.prisma |
|     |
| generator client { |
| provider = "prisma-client-js" |
| }   |
|     |
| datasource db { |
| provider = "postgresql" |
| url = env("DATABASE_URL") |
| }   |
|     |
| model User { |
| id String @id @default(uuid()) |
| email String @unique |
| password String |
| name String |
| role Role @default(CUSTOMER) |
| orders Order\[\] |
| createdAt DateTime @default(now()) |
| updatedAt DateTime @updatedAt |
| }   |
|     |
| model Product { |
| id String @id @default(uuid()) |
| name String |
| description String? |
| price Decimal @db.Decimal(10, 2) |
| stock Int @default(0) |
| isActive Boolean @default(true) |
| orderItems OrderItem\[\] |
| createdAt DateTime @default(now()) |
| updatedAt DateTime @updatedAt |
| }   |
|     |
| model Order { |
| id String @id @default(uuid()) |
| user User @relation(fields: \[userId\], references: \[id\]) |
| userId String |
| status OrderStatus @default(PENDING) |
| total Decimal @db.Decimal(10, 2) |
| items OrderItem\[\] |
| createdAt DateTime @default(now()) |
| updatedAt DateTime @updatedAt |
| }   |
|     |
| model OrderItem { |
| id String @id @default(uuid()) |
| order Order @relation(fields: \[orderId\], references: \[id\]) |
| orderId String |
| product Product @relation(fields: \[productId\], references: \[id\]) |
| productId String |
| quantity Int |
| unitPrice Decimal @db.Decimal(10, 2) |
| }   |
|     |
| enum Role { |
| ADMIN |
| CUSTOMER |
| }   |
|     |
| enum OrderStatus { |
| PENDING |
| CONFIRMED |
| SHIPPED |
| DELIVERED |
| CANCELLED |
| }   |

**Una vez clonado el repositorio, ejecutar:**

|     |
| --- |
| npx prisma migrate dev --name init |
| npx prisma generate |

**3\. Endpoints Requeridos**

El microservicio debe exponer los siguientes tres endpoints como mínimo:

**3.1 POST /auth/login — Autenticación**

|     |     |     |     |
| --- | --- | --- | --- |
| **POST** | /auth/login | 🔓 Público | Autentica un usuario y retorna un JWT |

Request body esperado:

|     |
| --- |
| {   |
| "email": "user@simplifud.com", |
| "password": "secret123" |
| }   |

Response esperado (200 OK):

|     |
| --- |
| {   |
| "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", |
| "user": { |
| "id": "uuid", |
| "name": "John Doe", |
| "email": "user@simplifud.com", |
| "role": "CUSTOMER" |
| }   |
| }   |

- Contraseñas deben almacenarse hasheadas (bcrypt o argon2)
- JWT debe incluir payload con id, email y role
- Manejar correctamente credenciales inválidas (401)

**3.2 GET /products — Listado de Productos**

|     |     |     |     |
| --- | --- | --- | --- |
| **GET** | /products | 🔒 Auth | Retorna listado paginado de productos activos |

Query params opcionales:

GET /products?page=1&limit=10&search=cafe

Response esperado (200 OK):

|     |
| --- |
| {   |
| "data": \[ |
| {   |
| "id": "uuid", |
| "name": "Café Americano", |
| "description": "Café negro sin azúcar", |
| "price": "45.00", |
| "stock": 100 |
| }   |
| \], |
| "meta": { |
| "total": 25, |
| "page": 1, |
| "limit": 10, |
| "totalPages": 3 |
| }   |
| }   |

- Requiere JWT válido en header Authorization: Bearer &lt;token&gt;
- Solo retornar productos con isActive = true
- Implementar paginación

**3.3 POST /orders — Creación de Orden**

|     |     |     |     |
| --- | --- | --- | --- |
| **POST** | /orders | 🔒 Auth | Crea una orden para el usuario autenticado |

Request body esperado:

|     |
| --- |
| {   |
| "items": \[ |
| { "productId": "uuid-producto-1", "quantity": 2 }, |
| { "productId": "uuid-producto-2", "quantity": 1 } |
| \]  |
| }   |

Response esperado (201 Created):

|     |
| --- |
| {   |
| "id": "uuid-orden", |
| "status": "PENDING", |
| "total": "135.00", |
| "items": \[ |
| {   |
| "productId": "uuid", |
| "name": "Café Americano", |
| "quantity": 2, |
| "unitPrice": "45.00", |
| "subtotal": "90.00" |
| }   |
| \], |
| "createdAt": "2024-01-15T10:30:00Z" |
| }   |

- El userId debe tomarse del JWT, nunca del body
- Validar que los productos existan, estén activos y tengan stock suficiente
- Calcular el total automáticamente en base a price \* quantity
- Manejar errores de stock insuficiente (409) o producto no encontrado (404)

**4\. Arquitectura y Patrones**

El candidato tiene libertad de arquitectura, pero se valorará especialmente:

**4.1 Patrón Repository**

Se recomienda (aunque no es obligatorio) implementar el patrón Repository para desacoplar la lógica de acceso a datos:

|     |
| --- |
| // Interfaz de ejemplo |
| interface IProductRepository { |
| findAll(params: PaginationDto): Promise&lt;PaginatedResult<Product&gt;>; |
| findById(id: string): Promise&lt;Product \| null&gt;; |
| findActiveProducts(params: PaginationDto): Promise&lt;PaginatedResult<Product&gt;>; |
| }   |
|     |
| // Implementación con Prisma |
| @Injectable() |
| export class ProductRepository implements IProductRepository { |
| constructor(private prisma: PrismaService) {} |
|     |
| async findAll(params: PaginationDto) { |
| // implementación... |
| }   |
| }   |

**4.2 Estructura de Módulos Sugerida**

|     |
| --- |
| src/ |
| ├── auth/ |
| │ ├── auth.module.ts |
| │ ├── auth.service.ts |
| │ ├── auth.controller.ts |
| │ ├── strategies/ # JWT strategy |
| │ └── guards/ # Auth guard |
| ├── products/ |
| │ ├── products.module.ts |
| │ ├── products.service.ts |
| │ ├── products.controller.ts |
| │ └── repositories/ # Product repository |
| ├── orders/ |
| │ ├── orders.module.ts |
| │ ├── orders.service.ts |
| │ ├── orders.controller.ts |
| │ └── repositories/ # Order repository |
| ├── prisma/ |
| │ └── prisma.service.ts |
| └── common/ |
| ├── dto/ # DTOs compartidos |
| ├── filters/ # Exception filters |
| └── interceptors/ # Response interceptors |

**4.3 Criterios de Calidad**

- Validación de inputs con class-validator y DTOs tipados
- Manejo global de excepciones (ExceptionFilter)
- Variables de entorno con @nestjs/config y archivo .env.example
- Separación clara entre Controller → Service → Repository
- No exponer datos sensibles (password) en ninguna respuesta

**5\. ⭐ Plus — Integración con LLM**

**Este apartado es opcional pero altamente valorado.** Demuestra capacidad para integrar inteligencia artificial en flujos de negocio reales.

**Objetivo**

Crear un endpoint adicional que permita registrar productos o generar órdenes usando lenguaje natural, procesado por un LLM.

**Endpoint: POST /ai/command**

|     |     |     |     |
| --- | --- | --- | --- |
| **POST** | /ai/command | 🔒 Auth | Procesa un comando en lenguaje natural |

El candidato puede elegir cualquier proveedor de LLM (OpenAI, Anthropic, Google Gemini, etc.).

Ejemplo de request — Registrar producto:

|     |
| --- |
| {   |
| "command": "Agrega un producto llamado Latte de vainilla, precio 55 pesos, stock 80 unidades" |
| }   |

Ejemplo de request — Crear orden:

|     |
| --- |
| {   |
| "command": "Quiero pedir 2 Café Americano y 1 Latte de vainilla" |
| }   |

Response esperado:

|     |
| --- |
| {   |
| "intent": "CREATE_ORDER", |
| "result": { /\* objeto order o product creado \*/ }, |
| "message": "Orden creada exitosamente con 3 productos" |
| }   |

**Sugerencia de Implementación**

- Usar function calling / tool use del LLM para extraer intención y parámetros estructurados
- OpenAI: tools / function_call
- Anthropic: tool_use blocks
- Gemini: functionDeclarations
- El LLM determina el intent (CREATE_PRODUCT, CREATE_ORDER, etc.) y extrae los campos
- El servicio NestJS ejecuta la acción correspondiente con los datos extraídos
- Manejar casos ambiguos con un mensaje de clarificación al usuario

El candidato puede diseñar el flujo de la forma que considere más adecuada. Se evaluará el criterio de diseño, no solo el resultado funcional.

**6\. Requisitos del README**

El repositorio debe incluir un README.md con las siguientes secciones:

- Descripción breve del proyecto y decisiones técnicas tomadas
- Instrucciones de instalación y configuración (.env.example incluido)
- Comandos para correr migraciones y seed de datos inicial (al menos un usuario ADMIN y un CUSTOMER)
- Documentación de endpoints (puede usar Swagger con @nestjs/swagger)
- Instrucciones para correr pruebas si aplica
- Sección explicando el diseño de la integración LLM (si se implementó el plus)

**7\. Rúbrica de Evaluación**

|     |     |     |
| --- | --- | --- |
| **Criterio** | **Puntos** | **Nivel** |
| Arquitectura y estructura del proyecto | **20 pts** | Base |
| Seguridad: JWT, hashing, guard de rutas | **20 pts** | Base |
| Endpoints funcionales y validaciones | **20 pts** | Base |
| Patrones de diseño (Repository, separación de capas) | **15 pts** | Intermedio |
| Manejo de errores y respuestas coherentes | **10 pts** | Intermedio |
| Código limpio, tipado TypeScript estricto | **10 pts** | Intermedio |
| Documentación (README + Swagger) | **5 pts** | Base |
| ⭐ Integración LLM (Plus) | **+20 pts** | Avanzado |

**Puntaje base máximo: 100 pts. El plus puede sumar hasta 20 puntos adicionales.**

**8\. Entrega**

|     |     |
| --- | --- |
| **Plazo** | 5 días hábiles a partir de la recepción de este documento |

|     |     |
| --- | --- |
| **Formato** | Repositorio Git público o privado (agregar acceso al evaluador) |

|     |     |
| --- | --- |
| **Evaluador** | El equipo de Engineering de Simplifud |

|     |     |
| --- | --- |
| **Dudas** | Pueden escribir al contacto que les compartió esta prueba |

El candidato puede tomar las decisiones de diseño que considere convenientes siempre que el código sea funcional, seguro y bien documentado. Preferimos ver un proyecto incompleto pero con buenas decisiones de arquitectura sobre uno completo pero sin estructura.

**¡Mucho éxito! — Simplifud Engineering Team**