<div align="center">
  <img src="public/bl-logo.png" alt="Beverage Ledger Logo" width="120" height="120">

# Beverage Ledger

**Gestión de inventario de licores para hostelería**

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red)](#-copyright-notice)

**Aplicación en producción: [beverage-ledger-lac.vercel.app](https://beverage-ledger-lac.vercel.app)**

</div>

---

## 🚨 **LEGAL DISCLAIMER**

> **⚠️ IMPORTANT NOTICE**: This software is an **INDEPENDENT PROJECT** and is **NOT affiliated, associated, authorized, endorsed by, or in any way officially connected** with any casino, resort, gaming company, or hospitality business.
>
> Any trade names, logos, or brand names mentioned are used for **EDUCATIONAL AND DEMONSTRATIVE PURPOSES ONLY** and are the property of their respective owners.
>
> This is a **GENERIC INVENTORY MANAGEMENT SYSTEM** that can be adapted for various hospitality environments.

---

## Qué es

Frontend de **Beverage Ledger**: registra movimientos de inventario —entradas, salidas, traspasos entre bodegas y ajustes—, muestra existencias por bodega con su kardex, reportes de consumo, historial auditable y PDF de cada movimiento.

> Este repositorio es solo el frontend. Toda la lógica de negocio vive en la API, en el repositorio `beverage-ledger-api`; el servidor de integración continua está en la carpeta `jenkins/beverage-ledger/`, hermana de los dos clones.

Lo que hace la aplicación:

- **Movimientos** con borrador, confirmación y anulación, y el PDF de cada uno.
- **Existencias** por bodega, alertas de stock bajo y kardex por producto.
- **Catálogo** de productos, categorías y marcas, con búsqueda y filtros en el servidor.
- **Reportes** de consumo y actividad por periodo.
- **Administración**: usuarios, invitaciones, bodegas, organización y log de auditoría.
- **Permisos por rol**: la interfaz oculta lo que el rol no puede hacer, y la API lo impide de todas formas.
- **Español e inglés**, con la zona horaria de la organización.

---

## Stack

- **Next.js 15** (App Router) con **React 19** y **TypeScript**.
- **TanStack Query** para el estado del servidor.
- **openapi-fetch** con tipos generados desde el OpenAPI de la API (`pnpm api:types`).
- **next-intl** para los textos y los formatos.
- **Tailwind CSS** y **Radix UI** para la interfaz.
- **Vitest** y **Testing Library** para las pruebas.

La sesión usa un access token en memoria y una cookie `httpOnly` de refresh emitida por la API; el token nunca se guarda en `localStorage`.

---

## Puesta en marcha

Requisitos: Node.js 22 y la API corriendo (en local o desplegada). pnpm llega por corepack, en la versión fijada en `packageManager`.

```bash
git clone https://github.com/sepita1234/beverage-ledger.git
cd beverage-ledger
corepack enable
pnpm install

cp .env.example .env     # NEXT_PUBLIC_API_URL apunta a la API
pnpm dev                 # http://localhost:3000
```

| Variable | Para qué |
|---|---|
| `NEXT_PUBLIC_API_URL` | Origen de la API, sin `/api/v1` y sin barra final |
| `NEXT_PUBLIC_GOOGLE_SIGN_IN` | `true` solo si la API tiene credenciales de Google |
| `NEXT_PUBLIC_BRAND_NAME` | Nombre del producto en las pantallas sin sesión (opcional) |
| `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` | Usuario de las pruebas que inician sesión contra la API real |

---

## Estructura

```
src/
  app/                 rutas (App Router): páginas delgadas que componen features
  components/ui/       primitivos sin lógica de negocio ni llamadas a la API
  components/layout/   estructura: AppShell, Topbar, navegación
  features/<dominio>/  componentes, hooks y lógica de cada dominio
  lib/api/             cliente HTTP, sesión, refresh y errores
  lib/forms/           reglas de validación y useFormValidation
  i18n/                mensajes y configuración de idioma
tests/                 pruebas de caminos, una por requisito funcional
tests/regression/      pruebas de regresión
Jenkinsfile            pipeline de integración y despliegue
vercel.json            desactiva los despliegues automáticos de Vercel
```

Las dependencias van en una sola dirección: `app/` → `features/` → `components/ui/`.

---

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Desarrollo con recarga |
| `pnpm build` / `start` | Compila y sirve |
| `pnpm lint` / `typecheck` / `format:check` | Calidad de código |
| `pnpm test` | Pruebas (Vitest) |
| `pnpm test:coverage` | Las mismas, con `coverage/lcov.info` para SonarQube |
| `pnpm api:types` | Regenera los tipos del cliente desde el OpenAPI de la API |
| `pnpm i18n:check` | Verifica que los dos idiomas tengan las mismas claves |

---

## Pruebas

Las pruebas viven en `tests/` y corren en jsdom. Ejercitan el código real de `src/` y solo simulan la red o el cliente `api`:

- **Pruebas de caminos** (`tests/rf-NN-front-*.test.ts(x)`): una por requisito funcional. Las de componentes renderizan el componente real con sus hooks simulados.
- **Pruebas de regresión** (`tests/regression/`): fijan comportamientos que un cambio podría romper sin que las de caminos lo noten, como que dos renovaciones de sesión simultáneas hagan una sola llamada.
- **Cuatro suites inician sesión contra la API real**: necesitan `TEST_USER_EMAIL`, `TEST_USER_PASSWORD` y un `NEXT_PUBLIC_API_URL` que responda.

El coverage se mide solo sobre los archivos que alguna prueba ejecuta, y el mínimo exigido es del **90 %**: `coverage.include` en `vitest.config.mts` y `sonar.coverage.exclusions` en `sonar-project.properties` se mueven juntas.

---

## Integración y despliegue continuos

Cada push a `main` lanza el pipeline en Jenkins, definido en el [`Jenkinsfile`](./Jenkinsfile):

1. **Instalación de dependencias**.
2. **Revisión estática**: lint, tipos y formato.
3. **Pruebas (unitarias, regresión)**, con coverage. Antes de lanzarlas, el pipeline despierta la API de Render, que en el plan gratuito puede estar dormida.
4. **Compilación**.
5. **Calidad (SonarQube)**: análisis y umbral de calidad; si no se cumple, el pipeline se detiene.
6. **Despliegue** en Vercel con su CLI, solo desde `main` y solo si todo lo anterior pasó.

Si una fase falla, las siguientes no se ejecutan y nada llega a producción.

**Vercel no despliega por su cuenta:** `vercel.json` desactiva los despliegues por push, y el `NEXT_PUBLIC_API_URL` de producción se configura en el proyecto de Vercel.

El servidor de Jenkins y SonarQube corren en Docker desde la carpeta `jenkins/beverage-ledger/`; su `README.md` explica cómo levantarlos.

---

## 👨‍💻 Author

**Tomás Córdoba Urquijo**
- Software Developer & Technology Specialist

---

## ⚠️ IMPORTANT DISCLAIMER

**TRADEMARK NOTICE**: This software is an independent project and is **NOT officially affiliated, endorsed, sponsored, or approved** by any casino, resort, or hospitality company. Any similarities to existing casino operations or brands are purely coincidental.

**INTENDED USE**: This system is designed as a general-purpose beverage inventory management solution that can be adapted for various hospitality environments.

**LIABILITY**: The author assumes no responsibility for any trademark infringement claims or legal issues arising from the use of this software.

**📋 For complete legal terms, see [DISCLAIMER.md](./DISCLAIMER.md)**

---

## 🚫 COPYRIGHT NOTICE

**© 2025 Tomás Córdoba Urquijo. All Rights Reserved.**

This software is proprietary and confidential. Unauthorized copying, distribution, modification, public display, public performance, or other use of this software and associated documentation files is strictly prohibited and may violate copyright law.

### 🔒 Licensing

**NO PERMISSION IS GRANTED TO:**
- Copy, modify, or distribute this software
- Use this software for commercial or personal purposes without explicit written authorization
- Create derivative works based on this software
- Reverse engineer or decompile this software

**⚠️ IMPORTANT:** This software may only be used with explicit written authorization from Tomás Córdoba Urquijo.

For licensing inquiries, contact: **Tomás Córdoba Urquijo**

### ⚖️ Legal Protection

This software and all associated materials are protected under:
- Copyright laws
- International copyright treaties
- Intellectual property laws and treaties

**Violation may result in civil penalties, criminal prosecution, monetary damages, and permanent injunction.**

---

<div align="center">
  <img src="public/bl-logo.png" alt="BL Logo" width="60" height="60">
</div>
