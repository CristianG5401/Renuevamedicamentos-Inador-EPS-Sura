# Publicar `renuevamedicamentos-inador` en npm con Bun

Esta guía está pensada para quien mantiene este repositorio y necesita versionar, publicar y validar la CLI en npm usando Bun.

El objetivo no es solo recordar comandos, sino dejar claro el orden correcto del flujo y los guardrails más importantes para evitar una release rota o una publicación fallida.

## Resumen del flujo

El camino normal de publicación es:

1. Autenticarte en npm.
2. Subir la versión del paquete.
3. Verificar tests y artefacto publicable.
4. Publicar en el registro.
5. Validar que la CLI publicada se pueda ejecutar.

## Prerrequisitos

Antes de publicar, asegúrate de tener:

- acceso a una cuenta de npm con permisos para publicar el paquete
- Bun instalado y funcionando
- el repositorio en un estado limpio
- la rama correcta con los cambios que quieres publicar

Opcionalmente, si vas a validar instalación global después de publicar, revisa que el binario global de Bun esté en tu `PATH`.

## 1. Autenticación en npm

El flujo principal de este proyecto es interactivo:

```bash
bunx npm login
```

Ese comando delega al CLI oficial de npm y guarda la sesión en tu configuración local, normalmente en `~/.npmrc`.

Después de autenticarte, valida que Bun/npm reconozcan tu usuario:

```bash
bunx npm whoami
```

Si `whoami` no muestra tu usuario, no sigas con la publicación todavía.

### Si tienes 2FA

Si tu cuenta usa autenticación de dos factores, npm puede pedirte un código OTP durante `login` o en el momento de publicar.

En ese caso:

- completa el flujo interactivo normalmente
- ten a mano tu app de autenticación al correr `bun publish`

### Alternativa con token

Aunque el flujo principal documentado aquí es `bunx npm login`, también puedes publicar con token si prefieres no hacer login interactivo:

```bash
export NPM_CONFIG_TOKEN=tu_token
bun publish
```

Esto es útil sobre todo en automatizaciones o si prefieres no depender de una sesión local persistida.

## 2. Subir la versión del paquete

Antes de publicar, incrementa la versión con `bun pm version`.

Ejemplos:

```bash
bun pm version patch
bun pm version minor
bun pm version major
```

Qué significa cada una:

- `patch`: fixes o cambios pequeños compatibles, por ejemplo `1.0.0 -> 1.0.1`
- `minor`: nueva funcionalidad compatible, por ejemplo `1.0.0 -> 1.1.0`
- `major`: cambios rompientes, por ejemplo `1.0.0 -> 2.0.0`

También puedes fijar una versión exacta:

```bash
bun pm version 1.2.0
```

### Por qué no conviene editar `package.json` a mano

Editar `"version"` manualmente funciona técnicamente, pero `bun pm version` es mejor como flujo de release porque centraliza el cambio de versión y deja más claro que estás preparando una publicación.

### Guardrail: nunca publiques sin subir versión

Si intentas publicar una versión que ya existe en npm, la publicación va a fallar. Esa protección del registry es útil y conviene conservarla.

Por eso:

- sube la versión antes de cada release
- no uses `--tolerate-republish` como flujo normal

Si quieres verificar la versión publicada actualmente, puedes consultar el registry:

```bash
bun pm view renuevamedicamentos-inador version
```

Si es la primera publicación del paquete, este comando puede responder con `404 Not Found`, lo cual es esperable.

## 3. Verificación local antes de publicar

Con la versión ya actualizada, corre la verificación local completa:

```bash
bun test
bun run build
bun run pack:dry-run
```

Qué valida cada paso:

- `bun test`: que el comportamiento cubierto por tests siga sano
- `bun run build`: que exista el artefacto publicable en `dist/cli.js`
- `bun run pack:dry-run`: que el tarball final contenga solo lo que se quiere publicar

### Qué deberías revisar en `pack:dry-run`

El paquete debería incluir solo lo necesario para consumir la CLI publicada, especialmente:

- `package.json`
- `README.md`
- `LICENSE`
- `dist/cli.js`

Si ves `src/`, tests, archivos internos o documentación no necesaria, detente y corrige el empaquetado antes de publicar.

## 4. Publicar el paquete

Cuando las validaciones locales salgan bien:

```bash
bun publish
```

Este proyecto tiene configurado:

- `publishConfig.access = "public"`
- `prepublishOnly = "bun run build"`

Eso significa que, justo antes de publicar, Bun volverá a generar el build de la CLI.

## 5. Validación post-publicación

Después de publicar, valida que el paquete realmente pueda usarse desde el registry.

Primero, prueba ejecución puntual:

```bash
bunx renuevamedicamentos-inador --help
```

Luego, si quieres validar instalación global:

```bash
bun add -g renuevamedicamentos-inador
renuevamedicamentos-inador --help
```

Con eso confirmas:

- que el paquete existe en npm
- que el binario quedó bien expuesto
- que la CLI arranca correctamente como paquete publicado

## Troubleshooting y guardrails

### Error: falta autenticación

Síntoma típico:

- `bun publish` falla con un mensaje parecido a `missing authentication`

Qué hacer:

```bash
bunx npm login
bunx npm whoami
```

Si sigues teniendo problemas, revisa tu `~/.npmrc` o publica usando token.

### Error: la versión ya existe

Síntoma típico:

- el registry rechaza la publicación porque esa versión ya fue usada

Qué hacer:

```bash
bun pm version patch
```

o el nivel que corresponda (`minor` / `major`) y luego vuelve a ejecutar la verificación local antes de publicar otra vez.

### Error: falta `dist/cli.js` o el build está desactualizado

Síntoma típico:

- `bun publish` o la instalación del paquete terminan con una CLI rota
- el binario apuntado en `package.json` no existe

Qué hacer:

```bash
bun run build
bun run pack:dry-run
```

Recuerda que el binario público de este paquete apunta a:

```txt
./dist/cli.js
```

Si ese archivo no existe o no está entrando al tarball, no publiques.

### Confusión entre `bun add` y `bun install`

Esta confusión es común cuando validas consumo del paquete:

- `bun add renuevamedicamentos-inador` agrega la dependencia al `package.json`
- `bun install` instala las dependencias ya declaradas

Entonces:

- para probar el paquete en un proyecto nuevo, usa `bun add`
- para instalar un proyecto que ya lo tiene declarado, usa `bun install`

### La instalación descarga mucho por `whatsapp-web.js`

Este paquete publica un tarball pequeño, pero su instalación puede ser más pesada porque `whatsapp-web.js` trae dependencias de runtime como Puppeteer.

Eso significa:

- el paquete publicado puede verse liviano
- la instalación real puede descargar bastante más

No es necesariamente un error. Solo hay que tenerlo en cuenta al validar la experiencia de instalación.

## Checklist rápida de maintainer

Si ya conoces el contexto y solo quieres la secuencia mínima:

```bash
bunx npm login
bunx npm whoami
bun pm version patch
bun test
bun run build
bun run pack:dry-run
bun publish
bunx renuevamedicamentos-inador --help
```
