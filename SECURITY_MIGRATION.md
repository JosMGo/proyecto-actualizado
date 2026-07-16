# 🔐 Migración de Seguridad de Contraseñas

## Cambios Realizados

Se ha implementado **hashing seguro de contraseñas** usando `bcryptjs` con 10 rounds de salt.

### Archivos Modificados

- ✅ `password-utils.js` - **Nuevo**: Utilidades de hashing y verificación
- ✅ `login-client.html` - Actualizado para verificar hashes
- ✅ `admin.html` - Agregados scripts de bcryptjs y password-utils
- ✅ `admin.js` - `saveUser()` ahora hashea contraseñas
- ✅ `admin-trabajo.js` - `saveWorkUser()` ahora hashea contraseñas
- ✅ `client.html` - Agregados scripts de bcryptjs y password-utils
- ✅ `client-trabajo.html` - Agregados scripts de bcryptjs y password-utils

## 🔄 Cómo Funciona

### Para Usuarios Nuevos
1. Se ingresa la contraseña en texto plano en el formulario de admin
2. Se hashea con `bcryptjs` (10 rounds) antes de guardar en Supabase
3. En el login, se verifica con `bcrypt.compareSync()`

### Para Usuarios Existentes
Las contraseñas viejas siguen funcionando (sin hashear) hasta que se editen.

**Importante**: Debe hacer que los clientes cambien sus contraseñas para que se hasheen.

## 📋 Paso a Paso: Migrar Contraseñas Existentes

### Opción 1: Manual en Admin (Recomendado)

**Portal por horas** (`admin.html`):
1. Dashboard Admin → pestaña **"Usuarios"** (barra: Tickets | Empresas | Horas | Técnicos | Usuarios | Calendario | Archivados | Reportes)
2. Clic en el ícono ✏️ (editar) junto al usuario
3. Escribir la nueva contraseña en el campo y guardar
4. ✅ Se hashea automáticamente al guardar

**Portal por trabajo**:
1. Dashboard Admin → pestaña **"Empresas"** → botón **"Dashboard admin trabajo"** (arriba a la derecha)
2. En el nuevo dashboard, pestaña **"Usuarios"** (barra: Tickets | Empresas | Técnicos | Usuarios | Calendario | Trabajos | Órdenes)
3. Clic en ✏️ junto al usuario → escribir nueva contraseña → guardar
4. ✅ Se hashea automáticamente al guardar

### Opción 2: Script SQL (Para hacer todo de una vez)

Si tienes acceso a Supabase, ejecuta este SQL en el SQL Editor:

```sql
-- ADVERTENCIA: Solo ejecutar si entiendes qué hace
-- Esto hashea todas las contraseñas sin hashear en work_users

-- work_users: Hashear contraseñas de usuarios por trabajo
UPDATE work_users
SET pass = crypt(pass, gen_salt('bf', 10))
WHERE pass NOT LIKE '$2%';

-- client_users: Hashear contraseñas de usuarios por horas
UPDATE client_users
SET pass = crypt(pass, gen_salt('bf', 10))
WHERE pass NOT LIKE '$2%';
```

**Nota**: Este SQL requiere que PostgreSQL tenga la extensión `pgcrypto` habilitada.

### Opción 3: Script JavaScript (Ejecutar en consola del navegador)

1. Ir a Dashboard Admin
2. Abrir Developer Tools (F12) → Console
3. Ejecutar:

```javascript
// Hashear todas las contraseñas en memoria
for (let u of WORK_USERS) {
  if (!isPasswordHashed(u.pass)) {
    u.pass = await hashPassword(u.pass);
    await dbUpsertWorkUser(u);
  }
}

// Para usuarios normales
for (let u of users) {
  if (!isPasswordHashed(u.pass)) {
    u.pass = await hashPassword(u.pass);
    await dbUpsertUser(u);
  }
}
```

## 🧪 Pruebas Recomendadas

1. **Test de login con contraseña antigua sin hashear**
   - Crear un usuario con contraseña en texto plano
   - Verificar que el login funciona (compatibilidad)

2. **Test de login con contraseña nueva hasheada**
   - Editar el usuario en admin (hashea automáticamente)
   - Verificar que el login sigue funcionando

3. **Test de contraseña incorrecta**
   - Intentar login con contraseña equivocada
   - Debe rechazar y bloquear tras 5 intentos

## ⚠️ Consideraciones de Seguridad

### Lo que Está Bien Ahora
✅ Contraseñas hasheadas con bcryptjs (10 rounds)
✅ Verificación segura con `bcrypt.compareSync()`
✅ Compatibilidad hacia atrás (sigue aceptando contraseñas sin hashear)

### Lo que Podría Mejorar (Futuro)
- [ ] Usar Supabase Auth en lugar de tabla `client_users` personalizada
- [ ] Implementar hashing en Edge Functions (servidor) en lugar del navegador
- [ ] Requerir cambio de contraseña en primer login
- [ ] Agregar 2FA (autenticación de dos factores)
- [ ] Implementar recuperación de contraseña segura

## 🚀 Activación Inmediata

Los cambios están activos ahora:
- Los nuevos usuarios se guardarán con contraseña hasheada
- Los usuarios existentes seguirán funcionando (sin hashear) hasta editar su contraseña
- El login funciona con ambos tipos de contraseñas

**Recomendación**: Notifica a los administradores que editen las contraseñas de los usuarios existentes.
