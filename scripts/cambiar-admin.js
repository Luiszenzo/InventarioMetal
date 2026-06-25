/**
 * Script de administración interactivo.
 * Permite listar y actualizar el correo electrónico y la contraseña de
 * cualquier administrador directamente en Firebase Auth y Firestore.
 *
 * Uso:
 *   node scripts/cambiar-admin.js
 */

const readline = require('readline');
const { auth, db } = require('../config/admin');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log('\n==================================================');
  console.log(' 🔐  ACTUALIZACIÓN DE CREDENCIALES DE ADMINISTRADOR');
  console.log('==================================================\n');

  try {
    // 1. Consultar administradores en Firestore
    console.log('🔍  Buscando usuarios con rol "admin" en Firestore...');
    const snapshot = await db.collection('users').where('rol', '==', 'admin').get();

    if (snapshot.empty) {
      console.log('\n⚠️   No se encontraron usuarios con rol "admin" en la base de datos.');
      const crear = await question('¿Desea crear un nuevo administrador inicial ahora mismo? (s/n): ');
      if (crear.toLowerCase() === 's' || crear.toLowerCase() === 'si') {
        await crearNuevoAdmin();
      }
      return;
    }

    // 2. Mostrar la lista de administradores
    console.log('\n👤  Administradores registrados:');
    console.log('─'.repeat(50));
    const admins = [];
    let idx = 1;
    snapshot.forEach(doc => {
      const data = doc.data();
      admins.push({ uid: doc.id, ...data });
      console.log(`  [${idx}] Nombre: ${data.nombre}`);
      console.log(`      Email:  ${data.email}`);
      console.log(`      UID:    ${doc.id}`);
      console.log('─'.repeat(50));
      idx++;
    });

    // 3. Seleccionar administrador
    const seleccionStr = await question('Seleccione el número del administrador a modificar (o presione Enter para el primero): ');
    let seleccion = parseInt(seleccionStr) - 1;
    if (isNaN(seleccion) || seleccion < 0 || seleccion >= admins.length) {
      seleccion = 0;
    }

    const adminUser = admins[seleccion];
    console.log(`\n👉  Seleccionado: ${adminUser.nombre} (${adminUser.email})`);

    // 4. Solicitar nuevos datos
    console.log('\n--- Ingrese las nuevas credenciales ---');
    console.log('(Deje el campo vacío y presione Enter para mantener el valor actual)\n');

    const nuevoEmail = await question(`Nuevo correo (Actual: ${adminUser.email}): `);
    const nuevoPass = await question('Nueva contraseña (mínimo 6 caracteres): ');

    const updates = {};
    const firestoreUpdates = {};

    // Validar y agregar correo
    if (nuevoEmail && nuevoEmail.trim() !== '') {
      const emailTrimmed = nuevoEmail.trim();
      if (!emailTrimmed.includes('@') || emailTrimmed.length < 5) {
        console.log('❌  Error: Formato de correo electrónico inválido.');
        return;
      }
      updates.email = emailTrimmed;
      firestoreUpdates.email = emailTrimmed;
    }

    // Validar y agregar contraseña
    if (nuevoPass && nuevoPass.trim() !== '') {
      const passTrimmed = nuevoPass.trim();
      if (passTrimmed.length < 6) {
        console.log('❌  Error: La contraseña debe tener al menos 6 caracteres.');
        return;
      }
      updates.password = passTrimmed;
    }

    // Si no hay cambios solicitados
    if (Object.keys(updates).length === 0) {
      console.log('\nℹ️   No se especificaron cambios. Saliendo sin modificar nada.');
      return;
    }

    // 5. Aplicar cambios
    console.log('\n⚡  Aplicando cambios en Firebase...');

    // Actualizar en Firebase Auth
    await auth.updateUser(adminUser.uid, updates);
    console.log('✅  Credenciales actualizadas en Firebase Auth correctamente.');

    // Actualizar en Firestore si el correo cambió
    if (Object.keys(firestoreUpdates).length > 0) {
      await db.collection('users').doc(adminUser.uid).update(firestoreUpdates);
      console.log('✅  Correo actualizado en el documento de Firestore.');
    }

    console.log('\n🎉  ¡Cambio de credenciales completado con éxito!  🎉');
    console.log('─'.repeat(50));
    console.log(`  📧  Nuevo Email:      ${updates.email || adminUser.email}`);
    if (updates.password) {
      console.log(`  🔑  Nueva Contraseña: ${updates.password}`);
    } else {
      console.log(`  🔑  Contraseña:       [Sin cambios]`);
    }
    console.log('─'.repeat(50));

  } catch (error) {
    console.error('\n❌  Error al actualizar credenciales:', error.message);
  } finally {
    rl.close();
    process.exit(0);
  }
}

async function crearNuevoAdmin() {
  console.log('\n🔧  Crear Nuevo Administrador:\n');
  const nombre = await question('Nombre completo: ');
  const email = await question('Correo electrónico: ');
  const password = await question('Contraseña (mínimo 6 caracteres): ');

  if (!nombre || !email || !password || password.trim().length < 6) {
    console.log('❌  Error: Datos inválidos o contraseña menor a 6 caracteres.');
    rl.close();
    process.exit(1);
  }

  try {
    console.log('\n⚡  Registrando nuevo administrador...');
    const userRecord = await auth.createUser({
      email: email.trim(),
      password: password.trim(),
      displayName: nombre.trim()
    });

    await db.collection('users').doc(userRecord.uid).set({
      nombre: nombre.trim(),
      email: email.trim(),
      rol: 'admin',
      creadoEn: new Date().toISOString()
    });

    console.log(`\n✅  Administrador "${nombre}" creado exitosamente.`);
    console.log(`📧  Email: ${email.trim()}`);
    console.log(`🔑  Contraseña: ${password.trim()}\n`);
  } catch (error) {
    console.error('❌  Error al crear administrador:', error.message);
  } finally {
    rl.close();
    process.exit(0);
  }
}

main();
