# Microservicio de Notificaciones

## 📁 Estructura del Proyecto

```
notifications-service/
├── 📁 src/
│   ├── 📁 api/
│   │   ├── 📁 notifications/
│   │   │   ├── notification.controller.ts
│   │   │   ├── notification.service.ts
│   │   │   ├── notification.routes.ts
│   │   │   └── notification.repository.ts
│   │   ├── 📁 channels/
│   │   │   ├── email/
│   │   │   │   ├── email.controller.ts
│   │   │   │   ├── email.service.ts
│   │   │   │   └── email.routes.ts
│   │   │   ├── sms/
│   │   │   │   ├── sms.controller.ts
│   │   │   │   ├── sms.service.ts
│   │   │   │   └── sms.routes.ts
│   │   │   └── push/
│   │   │       ├── push.controller.ts
│   │   │       ├── push.service.ts
│   │   │       └── push.routes.ts
│   │   └── 📁 templates/
│   │       ├── template.controller.ts
│   │       ├── template.service.ts
│   │       └── template.routes.ts
│   ├── 📁 core/
│   │   ├── 📁 config/
│   │   │   ├── env.ts
│   │   │   ├── database-manager.ts
│   │   │   └── message-queue.config.ts
│   │   ├── 📁 database/
│   │   │   ├── 📁 entities/
│   │   │   │   ├── notification.entity.ts
│   │   │   │   ├── notification-template.entity.ts
│   │   │   │   ├── notification-log.entity.ts
│   │   │   │   └── notification-preference.entity.ts
│   │   │   └── 📁 config/
│   │   │       └── database.config.ts
│   │   └── 📁 middlewares/
│   │       ├── auth.middleware.ts
│   │       ├── validation.middleware.ts
│   │       └── rate-limit.middleware.ts
│   ├── 📁 shared/
│   │   ├── 📁 interfaces/
│   │   │   ├── notification.interface.ts
│   │   │   ├── channel.interface.ts
│   │   │   └── template.interface.ts
│   │   ├── 📁 utils/
│   │   │   ├── logger.util.ts
│   │   │   ├── response.util.ts
│   │   │   └── validation.util.ts
│   │   ├── 📁 enums/
│   │   │   ├── notification-type.enum.ts
│   │   │   ├── notification-status.enum.ts
│   │   │   └── channel-type.enum.ts
│   │   └── 📁 errors/
│   │       ├── notification.error.ts
│   │       └── channel.error.ts
│   ├── 📁 providers/
│   │   ├── 📁 email/
│   │   │   ├── nodemailer.provider.ts
│   │   │   ├── sendgrid.provider.ts
│   │   │   └── amazon-ses.provider.ts
│   │   ├── 📁 sms/
│   │   │   ├── twilio.provider.ts
│   │   │   ├── aws-sns.provider.ts
│   │   │   └── nexmo.provider.ts
│   │   └── 📁 push/
│   │       ├── firebase.provider.ts
│   │       ├── apple-push.provider.ts
│   │       └── web-push.provider.ts
│   ├── 📁 queue/
│   │   ├── 📁 processors/
│   │   │   ├── email.processor.ts
│   │   │   ├── sms.processor.ts
│   │   │   └── push.processor.ts
│   │   ├── queue.manager.ts
│   │   └── queue.types.ts
│   ├── 📁 templates/
│   │   ├── 📁 email/
│   │   │   ├── 📁 layouts/
│   │   │   │   └── main.hbs
│   │   │   ├── 📁 partials/
│   │   │   │   ├── header.hbs
│   │   │   │   └── footer.hbs
│   │   │   └── 📁 pages/
│   │   │       ├── welcome.hbs
│   │   │       ├── password-reset.hbs
│   │   │       └── notification.hbs
│   │   ├── 📁 sms/
│   │   │   ├── welcome.txt
│   │   │   ├── verification.txt
│   │   │   └── alert.txt
│   │   └── 📁 push/
│   │       └── notification-templates.json
│   ├── 📁 i18n/
│   │   ├── middleware.ts
│   │   ├── types.ts
│   │   └── 📁 locales/
│   │       ├── 📁 en/
│   │       │   ├── notifications.json
│   │       │   └── channels.json
│   │       └── 📁 es/
│   │           ├── notifications.json
│   │           └── channels.json
│   ├── 📁 routes/
│   │   └── index.ts
│   ├── index.ts
│   └── server.ts
├── 📁 environments/
│   ├── .env.local
│   ├── .env.development
│   └── .env.production
├── 📁 cert/
│   └── 📁 development/
├── package.json
├── tsconfig.json
├── docker-compose.yml
└── Dockerfile

# 🔔 Microservicio de Notificaciones

Microservicio especializado en el envío de notificaciones a través de múltiples canales: email, SMS, push notifications y webhooks.

## 🚀 Características

### 📋 Tipos de Notificaciones Soportados
- ✉️ **Email**: HTML/Text con templates dinámicos
- 📱 **SMS**: Mensajes de texto cortos
- 📲 **Push Notifications**: Para apps móviles y web
- 🔗 **Webhooks**: Callbacks HTTP

### 🛠️ Proveedores Integrados
- **Email**: Nodemailer, SendGrid, Amazon SES
- **SMS**: Twilio, AWS SNS, Vonage (Nexmo)
- **Push**: Firebase Cloud Messaging, Apple Push Notifications

### ⚡ Características Avanzadas
- 🚀 **Colas asíncronas** con Redis y Bull
- 📅 **Programación** de notificaciones
- 🔄 **Reintentos automáticos** con backoff exponencial
- 🌍 **Internacionalización** (i18n)
- 📊 **Métricas y analytics** en tiempo real
- 🎨 **Sistema de templates** con Handlebars
- 🔒 **Rate limiting** configurable
- 📈 **Monitoreo** y observabilidad

## 🏗️ Arquitectura

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   API Gateway   │───▶│  Notifications   │───▶│   Providers     │
│                 │    │    Service       │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │   Redis Queue    │    │   External APIs │
                       │                  │    │                 │
                       └──────────────────┘    └─────────────────┘
```

## 🚀 Inicio Rápido

### Con Docker (Recomendado)
```bash
# Clonar el repositorio
git clone <repo-url>
cd notifications-service

# Configurar variables de entorno
cp environments/.env.example environments/.env.local

# Iniciar todos los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f notifications-service
```

### Desarrollo Local
```bash
# Instalar dependencias
npm install

# Configurar base de datos
npm run migration:run

# Iniciar en modo desarrollo
npm run dev
```

## 📡 API Endpoints

### Envío de Notificaciones
```http
POST /api/v1/notifications/send
Content-Type: application/json

{
  "type": "email",
  "recipient": "user@example.com",
  "template": "welcome",
  "data": {
    "userName": "Juan Pérez",
    "verificationCode": "123456"
  },
  "language": "es"
}
```

### Envío Masivo
```http
POST /api/v1/notifications/send-bulk
Content-Type: application/json

{
  "type": "email",
  "template": "newsletter",
  "recipients": [
    {
      "recipient": "user1@example.com",
      "data": { "name": "Juan" }
    },
    {
      "recipient": "user2@example.com", 
      "data": { "name": "María" }
    }
  ]
}
```

### Estado de Notificación
```http
GET /api/v1/notifications/{id}/status
```

## 🔧 Configuración

Las variables de entorno se configuran en `environments/.env.{NODE_ENV}`:

```env
# Aplicación
NODE_ENV=development
PORT=4001
APP_NAME=Notifications Service

# Base de datos
DB_HOST=localhost
DB_PORT=3307
DB_USER=admin
DB_PASSWORD=2025*notificacioneS
DB_NAME=notifications_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Email (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_FROM_NUMBER=+1234567890

# Push (Firebase)
FIREBASE_SERVICE_ACCOUNT_KEY=path/to/service-account.json
```

## 🔍 Monitoreo

- **Queue Dashboard**: http://localhost:3001
- **Health Check**: http://localhost:4001/health
- **Database Admin**: http://localhost:8081
- **Logs**: `./logs/` directory

## 🧪 Testing

```bash
# Ejecutar tests
npm test

# Tests con coverage
npm run test:coverage

# Tests en modo watch
npm run test:watch
```

## 📦 Deployment

### Producción con Docker
```bash
# Build imagen
docker build -t notifications-service:latest .

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes
```bash
# Apply manifests
kubectl apply -f k8s/
```

## 🤝 Integración con otros Microservicios

Este servicio se comunica con:
- **User Service**: Para obtener preferencias de usuario
- **Auth Service**: Para autenticación entre servicios

Ejemplo de integración desde otro microservicio:
```typescript
const response = await fetch('http://notifications-service:4001/api/v1/notifications/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${serviceToken}`
  },
  body: JSON.stringify({
    type: 'email',
    recipient: user.email,
    template: 'password-reset',
    data: { resetToken, userName: user.name }
  })
});
```