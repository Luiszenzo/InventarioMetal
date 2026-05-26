# 💰 Guía de Cotización
# Sistema de Inventario Interno para Restaurante

---

> **NOTA:** Este documento es una guía para ayudarte a definir el precio del proyecto.
> Los rangos están pensados para el **mercado mexicano** (desarrolladores freelance).
> Ajusta los valores según tu experiencia, ubicación y el perfil del cliente.

---

## 1. ¿Qué se entregó? (Resumen del alcance)

Antes de poner precio, es importante tener claro exactamente **qué incluye** el proyecto:

| ✅ Entregable | Descripción |
|---|---|
| PWA instalable en celular | Sin App Store, funciona en Android e iOS |
| Sistema de login seguro | Firebase Authentication con roles |
| Inventario de Cocina y Barra | Conteo con alertas de faltantes en tiempo real |
| Catálogo de productos editable | Agregar / eliminar productos por sección |
| Generación de PDF automática | Reporte profesional con colores y tablas |
| Historial de reportes en la nube | Guardado en Firebase Firestore |
| Panel de administración | Solo accesible para admins |
| Gestión de usuarios | Crear / eliminar empleados desde la app |
| Servidor backend seguro | Node.js + Express con middleware de seguridad |
| Código limpio y modular | Dividido en módulos reutilizables |

---

## 2. Estimación de Horas Invertidas

| Módulo / Tarea | Horas estimadas |
|---|---|
| Diseño de arquitectura y estructura del proyecto | 3 hrs |
| Configuración Firebase (Auth + Firestore + Admin SDK) | 4 hrs |
| Pantalla de login | 3 hrs |
| Router SPA y navegación entre vistas | 2 hrs |
| Módulo de inventario (carga, conteo, faltantes) | 8 hrs |
| Modal de agregar productos con categorías | 3 hrs |
| Módulo de reportes (Firestore + PDF con jsPDF) | 6 hrs |
| Panel de administración (reportes históricos + usuarios) | 6 hrs |
| API REST en Node.js (crear/eliminar usuarios) | 4 hrs |
| Middleware de seguridad (verifyAdmin) | 2 hrs |
| Configuración PWA (manifest + service worker) | 2 hrs |
| CSS y diseño responsive (mobile-first) | 5 hrs |
| Pruebas, correcciones y ajustes finales | 4 hrs |
| **TOTAL** | **≈ 52 horas** |

> **TIP:** Si lo construiste más rápido (por experiencia previa, uso de IA, etc.), **no cobres por hora** — cobra por **valor entregado**. El cliente paga por el resultado, no por el tiempo.

---

## 3. Tarifa por Hora de Referencia (México 2026)

| Nivel de experiencia | Tarifa/hora (MXN) | Tarifa/hora (USD) |
|---|---|---|
| Junior (0–2 años) | $150 – $300 | $8 – $15 |
| Semi-senior (2–4 años) | $300 – $600 | $15 – $30 |
| Senior (4+ años) | $600 – $1,200 | $30 – $60 |
| Agencia / Empresa | $800 – $2,000+ | $40 – $100+ |

---

## 4. Modelos de Precio Sugeridos

### 📦 Opción A — Precio por Proyecto (Recomendado para este caso)

| Paquete | Precio sugerido | Para quién |
|---|---|---|
| 🥉 **Básico** | $8,000 – $12,000 MXN | Restaurante pequeño, dueño con poco presupuesto |
| 🥈 **Estándar** | $15,000 – $22,000 MXN | Restaurante mediano, valoración justa del trabajo |
| 🥇 **Premium** | $25,000 – $40,000 MXN | Restaurante grande, cadena, o cliente corporativo |

> **RECOMENDACIÓN:** Para este proyecto, el precio Estándar es el más justo: **$15,000 – $20,000 MXN**.

---

### 📊 Opción B — Desglose por Módulo

| Módulo | Precio individual (MXN) |
|---|---|
| Login + autenticación con roles | $2,000 – $3,500 |
| Inventario (Cocina o Barra, uno solo) | $3,000 – $5,000 |
| Ambas secciones (Cocina + Barra) | $5,000 – $8,000 |
| Generación de reportes en PDF | $2,500 – $4,000 |
| Historial de reportes en la nube | $1,500 – $2,500 |
| Panel de administración | $2,500 – $4,000 |
| Gestión de usuarios (crear/eliminar) | $2,000 – $3,000 |
| Configuración PWA (instalable en móvil) | $1,500 – $2,500 |
| Servidor backend + API segura | $2,000 – $3,500 |
| **TOTAL DESGLOSADO** | **$22,500 – $36,500** |

---

### 🔄 Opción C — Precio por Hora (Solo si el cliente lo exige)

```
52 horas × $400/hr = $20,800 MXN   (semi-senior)
52 horas × $600/hr = $31,200 MXN   (senior)
```

---

## 5. ¿Cuánto Cobra la Competencia? (Benchmarking)

| Tipo de proveedor | Costo estimado (proyecto similar) |
|---|---|
| Freelancer junior en México | $5,000 – $10,000 MXN |
| **Freelancer semi-senior (tú)** | **$12,000 – $25,000 MXN** |
| Agencia digital pequeña | $30,000 – $80,000 MXN |
| App nativa iOS/Android (equivalente) | $80,000 – $200,000+ MXN |
| SaaS de inventario (suscripción mensual) | $500 – $2,000 MXN/mes = $6,000 – $24,000/año |

> **ARGUMENTO CLAVE:** Un SaaS de inventario les costaría entre $6,000 y $24,000 pesos **al año, indefinidamente**. Tu solución se paga sola en el primer o segundo año.

---

## 6. Costos de Operación para el Cliente

| Costo | Frecuencia | Precio estimado |
|---|---|---|
| Firebase Spark (plan gratuito) | Sin costo si no excede los límites | $0 MXN/mes |
| Firebase Blaze (si crece mucho) | Por uso | ~$50 – $500 MXN/mes |
| Servidor / Hosting (si se sube a la nube) | Mensual | $100 – $400 MXN/mes |
| Dominio propio (opcional) | Anual | $200 – $500 MXN/año |

---

## 7. Planes de Mantenimiento Mensual (Ingresos Recurrentes)

| Plan | Incluye | Precio/mes (MXN) |
|---|---|---|
| 🔧 **Básico** | Soporte por WhatsApp, correcciones de bugs | $500 – $800 |
| 🛠️ **Estándar** | Básico + 2 hrs de mejoras/mes + actualizaciones | $1,000 – $1,500 |
| 🚀 **Premium** | Estándar + 5 hrs de desarrollo + prioridad | $2,000 – $3,000 |

> **TIP:** Ofrece 1 mes de soporte gratis después de la entrega y luego conviértelo en contrato mensual.

---

## 8. Estructura de Pagos Recomendada

```
┌─────────────────────────────────────────────────────────┐
│  ANTICIPO        │  50% al firmar el acuerdo            │
│  ENTREGA PARCIAL │  25% al mostrar avance (demo)        │
│  ENTREGA FINAL   │  25% al entregar el proyecto         │
└─────────────────────────────────────────────────────────┘
```

---

## 9. Qué Incluir en tu Propuesta Económica

### ✅ Lo que el cliente recibe:
- Sistema completo funcionando desde el día 1
- Instalable en los teléfonos del personal (sin App Store)
- Datos seguros en la nube (no se pierden si se rompe el celular)
- Reportes PDF profesionales con solo un botón
- Control de quién accede y qué puede hacer
- Sin mensualidades de software externo
- Código fuente propiedad del cliente

### ❌ Lo que el cliente evita:
- Pagar $500–$2,000/mes por un SaaS de inventario
- Depender de hojas de cálculo con errores
- Perder tiempo haciendo inventarios a mano

---

## 10. Frases Útiles para Negociar

> *"Un sistema como este en una agencia costaría entre $30,000 y $80,000 pesos. Te estoy ofreciendo la misma calidad a un precio de desarrollador independiente."*

> *"¿Cuánto les cuesta al mes el tiempo que se pierde haciendo el inventario a mano? Si son 3 horas a la semana, en un año son más de 150 horas. Eso tiene un costo."*

> *"El plan más barato de software de inventario cuesta $600/mes = $7,200 al año. Mi solución la amortizas en el primer año."*

> *"El precio cubre todo: diseño, desarrollo, configuración en la nube, pruebas y capacitación. No hay costos ocultos."*

---

## 11. Precio Final Recomendado

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   Desarrollo del sistema (pago único):                  │
│                                                         │
│        $ 15,000 – $ 20,000 MXN                          │
│        (≈ $750 – $1,000 USD)                            │
│                                                         │
│   + Mantenimiento mensual opcional:                     │
│                                                         │
│        $800 – $1,200 MXN/mes                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 12. Checklist Antes de Cobrar

- [ ] El sistema funciona en celular (Android e iOS) correctamente
- [ ] El login y logout funcionan sin errores
- [ ] Se pueden crear y eliminar productos
- [ ] Los reportes PDF se generan y descargan correctamente
- [ ] El historial de reportes se muestra en el panel admin
- [ ] Los usuarios se pueden crear y eliminar desde la app
- [ ] Las credenciales del cliente (Firebase) están configuradas
- [ ] Se entregó documentación básica de uso
- [ ] Se hizo capacitación breve con el cliente

---

*Documento de referencia para cotización · Mayo 2026*
