# 📋 Propuesta de Proyecto
# Sistema de Inventario Interno para Restaurante

---

## 1. Resumen Ejecutivo

Este documento describe el diseño, arquitectura y funcionalidades del **Sistema de Inventario Interno** desarrollado para el control operativo de un restaurante. La aplicación permite al personal registrar, consultar y reportar el inventario diario de dos áreas clave del negocio: **Cocina** y **Barra**.

El sistema está construido como una **Progressive Web App (PWA)**, lo que significa que puede instalarse directamente en teléfonos y tablets sin pasar por una tienda de aplicaciones, funcionando con una experiencia similar a una app nativa.

---

## 2. Problema que Resuelve

Los restaurantes suelen llevar el control de su inventario de forma manual (papel, hojas de cálculo), lo que genera:

- Pérdida de tiempo en conteos y registros.
- Errores humanos al transcribir datos.
- Falta de historial organizado de inventarios anteriores.
- Dificultad para identificar productos faltantes a tiempo.
- Sin acceso rápido desde el celular del encargado.

**Este sistema automatiza y digitaliza todo ese proceso**, generando reportes en PDF de forma instantánea y guardando el historial en la nube.

---

## 3. Objetivo del Proyecto

Desarrollar una aplicación web interna, accesible desde cualquier dispositivo con navegador, que permita:

1. Controlar el inventario de **Cocina** y **Barra** por separado.
2. Registrar cantidades actuales de cada producto.
3. Alertar visualmente cuando un producto está por debajo del **mínimo en stock**.
4. **Generar y descargar reportes en PDF** al finalizar el conteo.
5. Guardar el historial de reportes en la nube (Firebase).
6. Gestionar los **usuarios** que tienen acceso al sistema (solo administradores).

---

## 4. Público Objetivo / Usuarios del Sistema

| Rol | Descripción | Permisos |
|---|---|---|
| **Administrador** | Dueño o gerente del restaurante | Acceso total: inventario + reportes + gestión de usuarios |
| **Empleado** | Encargado de cocina o barra | Solo puede hacer conteos y enviar reportes |

---

## 5. Stack Tecnológico

| Capa | Tecnología | Propósito |
|---|---|---|
| **Frontend** | HTML5, CSS3, JavaScript (ES Modules) | Interfaz de usuario |
| **Backend** | Node.js + Express | Servidor de API REST |
| **Base de datos** | Firebase Firestore | Almacenamiento de productos, reportes y usuarios |
| **Autenticación** | Firebase Authentication | Login seguro con correo y contraseña |
| **PDF** | jsPDF + jsPDF-AutoTable | Generación de reportes en PDF en el navegador |
| **Hosting/Deploy** | Node.js local (o cualquier servidor) | Servir la aplicación |
| **PWA** | Service Worker + Web App Manifest | Instalación en móvil, uso offline parcial |

---

## 6. Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTE (Navegador / App)                │
│                                                                 │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │  auth.js   │  │ inventory.js │  │   admin.js   │            │
│  │ (Firebase  │  │ (Productos,  │  │ (Reportes,   │            │
│  │  Auth)     │  │  Cantidades) │  │  Usuarios)   │            │
│  └────────────┘  └──────────────┘  └──────────────┘            │
│         │               │                   │                   │
│         └───────────────┴──────────┬────────┘                   │
│                                   │                             │
│                            ┌──────▼──────┐                      │
│                            │   app.js    │ ← Router principal   │
│                            └──────┬──────┘                      │
│                                   │                             │
│           ┌───────────────────────┤                             │
│           │ Firebase SDK (CDN)    │ reports.js + ui.js          │
│           └───────────────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
                          │         │
              ┌───────────┘         └───────────┐
              ▼                                 ▼
    ┌──────────────────┐            ┌───────────────────────┐
    │  Firebase Cloud  │            │  Node.js + Express    │
    │  (Auth + Firestore)           │  (API REST Servidor)  │
    │  - products      │            │                       │
    │  - reportes      │            │  POST /api/users/create│
    │  - users         │            │  GET  /api/users      │
    └──────────────────┘            │  DELETE /api/users/:id│
                                    └───────────────────────┘
```

---

## 7. Estructura de Archivos del Proyecto

```
InventarioInterno/
│
├── server.js                    ← Punto de entrada del servidor Node.js
├── package.json                 ← Dependencias del proyecto (npm)
├── .env                         ← Variables de entorno (puerto, etc.)
├── serviceAccountKey.json       ← Credenciales de Firebase Admin (privado)
│
├── config/
│   └── admin.js                 ← Inicialización de Firebase Admin SDK
│
├── routes/
│   └── users.js                 ← API REST para gestión de usuarios
│
└── public/                      ← Archivos que se sirven al navegador
    ├── index.html               ← App principal (SPA)
    ├── login.html               ← Pantalla de inicio de sesión
    ├── manifest.json            ← Configuración PWA
    ├── sw.js                    ← Service Worker (cache offline)
    │
    ├── css/
    │   └── styles.css           ← Todos los estilos de la aplicación
    │
    └── js/
        ├── firebase-config.js   ← Configuración del proyecto Firebase (cliente)
        ├── auth.js              ← Autenticación y acceso a Firestore
        ├── app.js               ← Controlador principal y router de vistas
        ├── inventory.js         ← Lógica del inventario (productos + cantidades)
        ├── reports.js           ← Generación de PDF y guardado de reportes
        ├── admin.js             ← Panel de administración (reportes + usuarios)
        └── ui.js                ← Componentes de interfaz (modal, toast, confirm)
```

---

## 8. Módulos del Sistema

### 8.1 Módulo de Autenticación (`auth.js` + `login.html`)

Este módulo es la **puerta de entrada** al sistema. Antes de ver cualquier dato, el usuario debe iniciar sesión con su correo y contraseña.

**¿Cómo funciona?**
- Usa **Firebase Authentication** para validar las credenciales.
- Al detectar un usuario autenticado, obtiene sus datos desde Firestore (nombre, rol).
- Si no hay sesión activa, redirige automáticamente a la pantalla de login.
- El token de Firebase se usa también para validar las llamadas a la API del servidor.

**Funciones clave:**
| Función | Descripción |
|---|---|
| `login(email, password)` | Inicia sesión con correo y contraseña |
| `logout()` | Cierra la sesión activa |
| `getUserData(uid)` | Obtiene el perfil del usuario desde Firestore |
| `onAuth(callback)` | Escucha cambios en el estado de autenticación |
| `getToken()` | Obtiene el token JWT del usuario para llamadas al API |

---

### 8.2 Módulo de Inventario (`inventory.js`)

Es el **módulo central** de la aplicación. Permite al usuario hacer el conteo físico de los productos de una sección (Cocina o Barra).

**Flujo de trabajo:**
1. El usuario selecciona **Cocina** o **Barra** en la pantalla principal.
2. Se cargan desde Firestore todos los productos activos de esa sección.
3. El usuario ajusta la **cantidad actual** de cada producto con los botones `+` / `−` o escribiendo directamente.
4. Los productos con cantidad menor al **mínimo configurado** se resaltan visualmente como ⚠️ **Faltante**.
5. Al terminar, el usuario presiona **"Enviar Reporte del Día"**.

**Funcionalidades:**
- Agrupación de productos por **categoría** (Carnes, Lácteos, Licores, etc.)
- Indicador visual de faltantes en tiempo real.
- Botón para **agregar nuevos productos** al catálogo (se guardan en Firestore).
- Botón para **eliminar productos** del catálogo (con confirmación).

**Datos que guarda cada producto en Firestore:**
```json
{
  "nombre": "Aceite de oliva",
  "categoria": "Aceites",
  "seccion": "cocina",
  "minimo": 2,
  "activo": true,
  "creadoEn": "2026-05-01T..."
}
```

---

### 8.3 Módulo de Reportes (`reports.js`)

Se encarga de **guardar el conteo en la nube** y **generar el PDF** automáticamente al enviar un reporte.

**¿Qué hace al enviar un reporte?**
1. Guarda un documento en la colección `reportes` de Firestore con:
   - Sección (cocina o barra)
   - Quién lo realizó (nombre + uid)
   - Lista completa de productos con cantidades y estados
   - Total de faltantes
   - Fecha y hora exactas (timestamp del servidor)
2. Genera un archivo **PDF profesional** con jsPDF que incluye:
   - Encabezado con color según la sección (naranja = Cocina, azul = Barra)
   - Fecha, responsable y resumen de faltantes
   - Tabla de productos agrupados por categoría con estado (✅ OK / ⚠️ Faltante)
   - Pie de página con numeración
3. El PDF se **descarga automáticamente** al dispositivo del usuario.

---

### 8.4 Módulo de Administración (`admin.js`)

Disponible **solo para usuarios con rol "admin"**. Accesible desde el botón ⚙️ Admin en el encabezado.

Contiene dos pestañas:

#### Pestaña: Reportes Históricos
- Muestra todos los reportes enviados, del más reciente al más antiguo.
- Se puede filtrar por **Todos / Cocina / Barra**.
- Cada reporte muestra: fecha, sección, quien lo realizó y cuántos faltantes tuvo.
- Botón **"📄 PDF"** para regenerar y descargar el PDF de cualquier reporte anterior.

#### Pestaña: Gestión de Usuarios
- Lista todos los empleados registrados en el sistema.
- Permite **crear nuevos empleados** con: nombre, correo, contraseña y rol.
- Permite **eliminar empleados** (con confirmación), excepto a uno mismo.
- La creación y eliminación se hace a través de la **API del servidor** (Node.js + Firebase Admin), ya que Firebase no permite crear usuarios directamente desde el navegador de forma segura.

---

### 8.5 Módulo de Interfaz (`ui.js`)

Centraliza los componentes de UI compartidos por toda la aplicación.

| Componente | Descripción |
|---|---|
| **Modal** | Ventana emergente reutilizable para formularios y confirmaciones |
| **Toast** | Notificación temporal (éxito / error / info) que aparece en la esquina |
| **Confirm** | Diálogo de confirmación (Sí / Cancelar) con promesa asíncrona |
| **Service Worker** | Registro del SW para funcionalidades PWA (cache offline) |

---

### 8.6 Módulo del Servidor (`server.js` + `routes/users.js`)

Servidor **Node.js con Express** que actúa como intermediario seguro entre el navegador y Firebase Admin SDK.

**¿Por qué es necesario un servidor?**
> Firebase Admin SDK tiene privilegios de superadministrador. Por seguridad, **no puede ejecutarse en el navegador**. Se necesita un servidor para operaciones como crear o eliminar usuarios de Authentication.

**Endpoints disponibles:**

| Método | Ruta | Descripción | Protección |
|---|---|---|---|
| `GET` | `/api/users` | Lista todos los usuarios | Solo admin |
| `POST` | `/api/users/create` | Crea un nuevo usuario en Firebase Auth + Firestore | Solo admin |
| `DELETE` | `/api/users/:uid` | Elimina usuario de Auth y Firestore | Solo admin |

**Middleware de seguridad (`verifyAdmin`):**
Cada llamada al API verifica que:
1. El request incluya un **Bearer Token** (JWT de Firebase).
2. El token sea **válido** (verificado con Firebase Admin).
3. El usuario tenga el **rol "admin"** en Firestore.

---

### 8.7 Progressive Web App (PWA)

La aplicación está configurada como PWA, lo que permite:

- **Instalación en dispositivos móviles** (Android e iOS) desde el navegador, sin pasar por Play Store o App Store.
- Ícono en el escritorio del teléfono.
- Pantalla de carga tipo splash screen.
- Experiencia a pantalla completa (sin barra del navegador).
- Cache básico de recursos estáticos (funcionalidad offline parcial vía Service Worker).

**Configuración en `manifest.json`:**
```json
{
  "name": "Inventario Restaurante",
  "short_name": "Inventario",
  "display": "standalone",
  "theme_color": "#F97316",
  "orientation": "portrait"
}
```

---

## 9. Flujo de Uso del Sistema (Paso a Paso)

```
[Empleado abre la app]
        │
        ▼
[Pantalla de Login] ─── (credenciales incorrectas) ───► [Error]
        │
        │ (login exitoso)
        ▼
[Pantalla Principal: ¿Qué inventario vas a hacer?]
        │
   ┌────┴─────┐
   ▼          ▼
[Cocina]   [Barra]
   │          │
   └────┬─────┘
        │
        ▼
[Lista de productos con +/− para cada uno]
        │
        │ (ajusta cantidades, ve faltantes en rojo)
        │
        ▼
[Botón: "Enviar Reporte del Día"]
        │
        ▼
[Confirmación: X productos · Y faltantes]
        │
        ▼
[Se guarda en Firestore + se descarga PDF]
        │
        ▼
[Regresa a la pantalla principal]
```

---

## 10. Seguridad del Sistema

| Aspecto | Implementación |
|---|---|
| **Autenticación** | Firebase Auth (JWT tokens) |
| **Control de roles** | Verificación de rol en Firestore + middleware en el servidor |
| **API protegida** | Todas las rutas del servidor requieren token de admin válido |
| **Credenciales privadas** | `serviceAccountKey.json` y `.env` en `.gitignore` (no se suben a git) |
| **No auto-eliminación** | Un admin no puede eliminar su propia cuenta |

---

## 11. Base de Datos (Firebase Firestore)

El proyecto usa tres colecciones principales:

### Colección `products`
```
products/
  {id}/
    nombre: "Aceite de oliva"
    categoria: "Aceites"
    seccion: "cocina"        ← "cocina" | "barra"
    minimo: 2
    activo: true
    creadoEn: Timestamp
```

### Colección `reportes`
```
reportes/
  {id}/
    seccion: "cocina"
    fecha: Timestamp
    creadoPor: { uid: "...", nombre: "Juan" }
    totalFaltantes: 3
    productos: [
      { nombre: "Aceite", categoria: "Aceites", cantidad: 1, minimo: 2, esFaltante: true },
      ...
    ]
```

### Colección `users`
```
users/
  {uid}/                     ← UID de Firebase Auth
    nombre: "María González"
    email: "maria@restaurante.com"
    rol: "admin"             ← "admin" | "empleado"
    creadoEn: "2026-05-01..."
```

---

## 12. Requisitos para Ejecutar el Proyecto

### Prerequisitos
- Node.js v18 o superior
- Una cuenta en Firebase con proyecto configurado
- Firebase Authentication habilitado (método: correo/contraseña)
- Firebase Firestore creado en modo de producción o prueba

### Instalación
```bash
# 1. Clonar o descargar el proyecto
cd InventarioInterno

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
# Crear archivo .env:
PORT=3000

# 4. Colocar el archivo serviceAccountKey.json
#    (descargado desde Firebase Console → Configuración del proyecto → Cuentas de servicio)

# 5. Iniciar el servidor
npm start
# o para desarrollo con recarga automática:
npm run dev
```

---

## 13. Mejoras Futuras Sugeridas

| Mejora | Descripción |
|---|---|
| 🔔 **Notificaciones push** | Alertar al admin cuando hay reportes con muchos faltantes |
| 📊 **Dashboard de estadísticas** | Gráficas de tendencia de faltantes por semana/mes |
| 📦 **Módulo de pedidos** | Generar lista de compras automática basada en faltantes |
| 🔄 **Sincronización offline** | Guardar conteos localmente y sincronizar al recuperar conexión |
| 🕐 **Historial por turno** | Distinguir inventarios por turno (mañana/noche) |
| 📱 **Notificación de instalación PWA** | Guía para instalar en el teléfono del empleado |
| 🖨️ **Envío por WhatsApp/Email** | Compartir el PDF directamente desde la app |

---

## 14. Conclusión

El **Sistema de Inventario Interno para Restaurante** es una solución completa, moderna y segura que digitaliza el proceso de control de inventario. Al estar construido como PWA con Firebase en la nube, es:

- ✅ **Accesible** desde cualquier celular o computadora
- ✅ **Seguro** con autenticación y roles de usuario
- ✅ **Eficiente** al generar reportes PDF en segundos
- ✅ **Escalable** al poder agregar más secciones, usuarios y funcionalidades
- ✅ **Sin costo de infraestructura** usando el plan gratuito de Firebase (Spark)

---

*Documento generado el 18 de mayo de 2026*
