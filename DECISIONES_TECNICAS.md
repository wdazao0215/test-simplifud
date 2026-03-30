# Decisiones Técnicas - Simplifud Backend

## 1. Arquitectura General

### Stack Tecnológico

- **Framework**: NestJS + TypeScript
- **ORM**: Prisma 5.x
- **Base de Datos**: PostgreSQL
- **Autenticación**: JWT + bcrypt
- **API**: REST con Swagger/OpenAPI
- **Validación**: class-validator + class-transformer
- **AI**: Puter.ai (@heyputer/puter.js)
- **Testing**: Jest (unit + e2e)

### Estructura de Proyecto

```
src/
├── auth/                    # Módulo de autenticación
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   ├── strategies/          # JWT Strategy
│   ├── guards/              # Auth Guards
│   └── dto/                # LoginDto
├── products/               # Módulo de productos
│   ├── products.controller.ts
│   ├── products.service.ts
│   ├── products.module.ts
│   ├── repositories/        # ProductRepository
│   └── dto/                # DTOs de productos
├── orders/                 # Módulo de órdenes
│   ├── orders.controller.ts
│   ├── orders.service.ts
│   ├── orders.module.ts
│   ├── repositories/        # OrderRepository
│   └── dto/                # DTOs de órdenes
├── ai/                     # Módulo de AI (Plus)
│   ├── ai.controller.ts
│   ├── ai.service.ts
│   └── ai.module.ts
├── prisma/                 # Servicio de Prisma
├── common/                 # Componentes compartidos
│   ├── dto/               # DTOs comunes
│   ├── filters/           # Exception filters
│   └── interceptors/       # Interceptors
└── main.ts
```

---

## 2. Autenticación y Seguridad

### JWT Strategy

- Uso de Passport.js con estrategia JWT
- Payload del token: `{ sub, email, role }`
- Extracción del token del header `Authorization: Bearer <token>`
- NoExpiration configurada por defecto (expira en 1d)

### Hash de Contraseñas

- Algoritmo: bcrypt con salt de 10 rounds
- Comparación en login con `bcrypt.compare()`

### Guards

- `JwtAuthGuard` para endpoints protegidos
- Aplicado a nivel de controller para Products, Orders, AI

---

## 3. Patrones de Diseño

### Patrón Repository

Implementado para desacoplar la lógica de acceso a datos:

**ProductRepository**

- `findActiveProducts(paginationDto)` - Productos activos con paginación
- `findById(id)` - Buscar por ID
- `findByIds(ids)` - Buscar múltiples por IDs

**OrderRepository**

- `create(data)` - Crear orden
- `findById(id)` - Buscar por ID
- `findByUserId(userId)` - Órdenes de usuario
- `findByUserIdPaginated(userId, paginationDto)` - Órdenes con paginación

### Separación de Capas

- **Controller**: Manejo de HTTP, validación básica, documentación Swagger
- **Service**: Lógica de negocio, validaciones complejas
- **Repository**: Acceso a datos, queries de Prisma

---

## 4. Validación de Datos

### DTOs con class-validator

**LoginDto**

- `email`: @IsEmail()
- `password`: @IsNotEmpty(), @MinLength(6)

**CreateOrderDto**

- `items`: @IsArray(), @ValidateNested()
- `items[].productId`: @IsString()
- `items[].quantity`: @IsInt(), @Min(1)

**PaginationDto / PaginationProductDto**

- `page`: @IsOptional(), @Min(1)
- `limit`: @IsOptional(), @Min(1), @Max(100)
- `search`: @IsOptional()

**CreateProductDto**

- `name`: @IsString(), @IsNotEmpty()
- `description`: @IsOptional(), @IsString()
- `price`: @IsNumber(), @Min(0)
- `stock`: @IsNumber(), @Min(0), @Max(999999)

### ValidationPipe Global

```typescript
new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
```

---

## 5. Manejo de Errores

### HttpExceptionFilter Global

- Manejo centralizado de excepciones
- Logging por nivel de error:
  - `ERROR` (500+): Errores del servidor
  - `WARN` (400+): Errores del cliente
  - `LOG` (normales): Respuestas exitosas
- Formato de respuesta consistente

### Códigos de Error

- **400**: Bad Request (validación, stock insuficiente)
- **401**: Unauthorized (credenciales inválidas, token faltante)
- **404**: Not Found (producto no encontrado)
- **409**: Conflict (estado conflictivo)
- **500**: Internal Server Error

---

## 6. Documentación API

### Swagger/OpenAPI

- Configuración en `main.ts`
- Documentación automática de endpoints
- Autenticación Bearer en todos los endpoints protegidos
- Ejemplos de request/response en cada endpoint

### Decoradores utilizados

- `@ApiTags()` - Agrupación
- `@ApiOperation()` - Descripción
- `@ApiResponse()` - Códigos de respuesta
- `@ApiBearerAuth()` - Requiere JWT
- `@ApiQuery()` - Query params
- `@ApiProperty()` - Propiedades en DTOs

---

## 7. Paginación

### Formato de Respuesta

```json
{
  "data": [...],
  "meta": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  }
}
```

### Implementación

- Products: siempre paginado
- Orders: paginado opcional (si se envían query params)
- Cálculo de `totalPages = Math.ceil(total / limit)`

---

## 8. Integración LLM (Plus)

### Proveedor: Puter.ai

- Sin API key requerida (usa auth token de cuenta Puter)
- Modelo: GPT-4o
- Inicialización con `init(authToken)`

### Manejo de Respuestas

- Limpieza de markdown (` ```json ... ``` `)
- Soporte para claves alternativas: `intent` / `intention`
- Soporte para parámetros: `parameters` o claves directas

### Prompt del Sistema

```
Eres un asistente que extrae información de comandos en lenguaje natural
para un sistema de pedidos de café/restaurante.
Debes analizar el comando del usuario y determinar la intención
(CREATE_PRODUCT o CREATE_ORDER).
Responde SOLO con JSON válido, sin texto adicional.
```

---

## 9. Logging

### Niveles de Log

- **ERROR**: Errores críticos, fallos de conexión
- **WARN**: Errores de negocio, advertencias
- **LOG**: Operaciones normales
- **DEBUG**: Información detallada (requests, responses)

### Servicios con Logging

- `AuthService`: Login attempts, validación
- `OrdersService`: Creación, errores de stock
- `AiService`: Comandos, respuestas
- `PrismaService`: Conexión BD
- `HttpExceptionFilter`: Todas las respuestas HTTP
- `main.ts`: Inicio de aplicación

---

## 10. Testing

### Unit Tests (Jest)

- **AuthService**: 5 tests
- **ProductsService**: 8 tests
- **OrdersService**: 9 tests
- **AiService**: 8 tests
- **AppController**: 1 test
- **Total**: 31 tests

### E2E Tests (SuperTest)

- **auth.e2e-spec.ts**: Login, credenciales inválidas
- **products.e2e-spec.ts**: Auth, paginación, búsqueda
- **orders.e2e-spec.ts**: CRUD, validación stock

### Estrategia de Testing

- Mock de dependencias con `jest.fn()`
- Mock de Prisma en tests unitarios
- Tests independientes (cleanup en afterEach)

---

## 11. Base de Datos

### Schema Prisma

- Modelo exactamente como especificado en el documento
- Enums: Role (ADMIN, CUSTOMER), OrderStatus (PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED)
- Relaciones: User → Orders → OrderItems → Products

### Seed

- Usuario ADMIN: admin@simplifud.com / admin123
- Usuario CUSTOMER: customer@simplifud.com / customer123
- 10 productos de ejemplo

---

## 12. Configuración

### Variables de Entorno (.env)

```
DATABASE_URL=postgresql://user:password@localhost:5432/simplifud
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1d
PORT=3000
PUTER_AUTH_TOKEN=your-puter-token
```

### Docker Compose

- PostgreSQL 16-alpine
- Puerto 5432
- Healthcheck configurado

---

## 13. Extras Implementados

1. **Paginación en Orders**: GET /orders?page=1&limit=10
2. **DTOs para Products**: CreateProductDto, PaginationProductDto
3. **Búsqueda en Products**: ?search=cafe
4. **Logging estructurado**: Logger por servicio
5. **Validación estricta**: forbidNonWhitelisted

---

## 14. Pendientes / Mejoras Futuras

- [ ] Tests E2E con base de datos en memoria
- [ ] Rate limiting
- [ ] Cacheo de productos
- [ ] Webhooks para notificaciones
- [ ] Migración de estado de órdenes
- [ ] Tests de cobertura > 80%
