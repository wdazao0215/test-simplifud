# Simplifud Backend Microservice

Backend microservicio desarrollado con NestJS + TypeScript para la gestión de usuarios, productos y órdenes.

## Stack Tecnológico

- **Framework**: NestJS + TypeScript
- **ORM**: Prisma
- **Base de Datos**: PostgreSQL
- **Autenticación**: JWT + bcrypt
- **API**: REST con Swagger/OpenAPI
- **Validación**: class-validator + class-transformer

## Arquitectura

El proyecto sigue una arquitectura modular con separación clara de responsabilidades:

```
src/
├── auth/                 # Módulo de autenticación
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   ├── strategies/       # JWT Strategy
│   └── guards/          # Auth Guards
├── products/            # Módulo de productos
│   ├── products.controller.ts
│   ├── products.service.ts
│   ├── products.module.ts
│   └── repositories/    # Product Repository
├── orders/              # Módulo de órdenes
│   ├── orders.controller.ts
│   ├── orders.service.ts
│   ├── orders.module.ts
│   └── repositories/    # Order Repository
├── prisma/              # Servicio de Prisma
├── common/              # Componentes compartidos
│   ├── dto/
│   ├── filters/
│   └── interceptors/
└── main.ts
```

## Instalación y Configuración

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Docker (opcional)

### 1. Clonar el repositorio

```bash
git clone <repo-url>
cd Test-simplifud
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Copiar el archivo `.env.example` a `.env`:

```bash
cp .env.example .env
```

Configurar las variables en `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/simplifud?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="1d"
PORT=3000
OPENAI_API_KEY=""
```

### 4. Configurar Base de Datos

#### Opción A: Docker Compose

```bash
docker-compose up -d
```

#### Opción B: PostgreSQL local

Asegúrate de tener PostgreSQL instalado y configurado.

### 5. Ejecutar migraciones

```bash
npx prisma migrate dev --name init
```

### 6. Generar Prisma Client

```bash
npx prisma generate
```

### 7. Ejecutar Seed (datos iniciales)

```bash
npm run prisma:seed
```

Esto creará:

- Usuario ADMIN: `admin@simplifud.com` / `admin123`
- Usuario CUSTOMER: `customer@simplifud.com` / `customer123`
- 10 productos de ejemplo

### 8. Iniciar la aplicación

```bash
# Desarrollo
npm run start:dev

# Producción
npm run start:prod
```

La API estará disponible en: `http://localhost:3000`
Swagger UI: `http://localhost:3000/api`

## Endpoints

### Autenticación

| Método | Endpoint      | Descripción        | Auth |
| ------ | ------------- | ------------------ | ---- |
| POST   | `/auth/login` | Autenticar usuario | No   |

### Productos

| Método | Endpoint    | Descripción                         | Auth |
| ------ | ----------- | ----------------------------------- | ---- |
| GET    | `/products` | Listar productos activos (paginado) | Sí   |

### Órdenes

| Método | Endpoint  | Descripción                | Auth |
| ------ | --------- | -------------------------- | ---- |
| POST   | `/orders` | Crear una orden            | Sí   |
| GET    | `/orders` | Listar órdenes del usuario | Sí   |

### AI (Plus)

| Método | Endpoint      | Descripción                          | Auth |
| ------ | ------------- | ------------------------------------ | ---- |
| POST   | `/ai/command` | Procesar comando en lenguaje natural | Sí   |

## Ejemplos de Uso

### Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "customer@simplifud.com", "password": "customer123"}'
```

Respuesta:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "customer@simplifud.com",
    "role": "CUSTOMER"
  }
}
```

### Listar Productos

```bash
curl -X GET 'http://localhost:3000/products?page=1&limit=10' \
  -H "Authorization: Bearer <token>"
```

### Crear Orden

```bash
curl -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"productId": "uuid-producto-1", "quantity": 2}
    ]
  }'
```

## Pruebas

```bash
# Unit tests
npm run test

# Coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

## Decisiones Técnicas

1. **Patrón Repository**: Implementado para Products y Orders para desacoplar la lógica de acceso a datos.

2. **JWT Strategy**: Utiliza Passport.js con estrategia JWT para autenticación stateless.

3. **Validación de DTOs**: Uso de class-validator para validación de entrada en todos los endpoints.

4. **Manejo de Errores**: ExceptionFilter global para respuestas consistentes.

5. **Swagger**: Documentación automática de API con @nestjs/swagger.

6. **Integración LLM**: Endpoint `/ai/command` que usa OpenAI GPT para procesar lenguaje natural y crear productos u órdenes.

## Integración LLM (Plus)

El endpoint `/ai/command` permite crear productos y órdenes usando lenguaje natural.

### Configuración

Agregar la API key de OpenAI en el archivo `.env`:

```env
OPENAI_API_KEY="sk-..."
```

### Ejemplos de Uso

#### Crear Producto

```bash
curl -X POST http://localhost:3000/ai/command \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"command": "Agrega un producto llamado Latte de vainilla, precio 55 pesos, stock 80 unidades"}'
```

#### Crear Orden

```bash
curl -X POST http://localhost:3000/ai/command \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"command": "Quiero pedir 2 Café Americano y 1 Latte de vainilla"}'
```

### Diseño de la Implementación

1. El endpoint recibe un comando en lenguaje natural
2. Se envía a OpenAI GPT con un prompt que indica el formato esperado
3. El LLM retorna un JSON con la intención (CREATE_PRODUCT o CREATE_ORDER) y los parámetros
4. El servicio ejecuta la acción correspondiente usando los datos extraídos
5. Se retorna el resultado al usuario

## Licencia

MIT
