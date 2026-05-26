/**
 * Script de configuración inicial.
 * Crea el primer usuario administrador directamente en Firebase
 * usando el Admin SDK (sin necesitar autenticación previa).
 *
 * Uso:
 *   node scripts/crear-admin.js
 */

const path = require('path');
const admin = require('firebase-admin');
const serviceAccount = require(path.join(__dirname, '../serviceAccountKey.json'));

// ─── Configura aquí tu primer administrador ───────────────────────────────────
const ADMIN_EMAIL    = 'admin@inventario.com';   // ← cambia esto
const ADMIN_PASSWORD = 'Admin1234!';             // ← cambia esto (mín. 6 chars)
const ADMIN_NOMBRE   = 'Administrador';          // ← cambia esto
// ─────────────────────────────────────────────────────────────────────────────

// Inicializar con un nombre de app único para evitar conflictos
const app = admin.initializeApp(
  { credential: admin.credential.cert(serviceAccount) },
  'seed-' + Date.now()
);

const auth = admin.auth(app);
const db   = admin.firestore(app);

async function crearAdmin() {
  console.log('\n🔧  Creando usuario administrador inicial...\n');

  // 1. Crear el usuario en Firebase Auth
  let userRecord;
  try {
    userRecord = await auth.createUser({
      email:       ADMIN_EMAIL,
      password:    ADMIN_PASSWORD,
      displayName: ADMIN_NOMBRE,
    });
    console.log(`✅  Usuario creado en Firebase Auth`);
    console.log(`    UID: ${userRecord.uid}`);
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      // Si ya existe, lo recuperamos para actualizar Firestore
      userRecord = await auth.getUserByEmail(ADMIN_EMAIL);
      console.log(`ℹ️   El usuario ya existe en Firebase Auth (UID: ${userRecord.uid})`);
    } else {
      throw err;
    }
  }

  // 2. Guardar el perfil con rol "admin" en Firestore
  await db.collection('users').doc(userRecord.uid).set({
    nombre:   ADMIN_NOMBRE,
    email:    ADMIN_EMAIL,
    rol:      'admin',
    creadoEn: new Date().toISOString(),
  }, { merge: true });

  console.log(`✅  Perfil guardado en Firestore con rol "admin"\n`);
  console.log('─'.repeat(50));
  console.log('  Ya puedes iniciar sesión con:');
  console.log(`  📧  Email:      ${ADMIN_EMAIL}`);
  console.log(`  🔑  Contraseña: ${ADMIN_PASSWORD}`);
  console.log('─'.repeat(50));
  console.log('\n⚠️   Recuerda cambiar la contraseña después de entrar.\n');

  await app.delete();
  process.exit(0);
}

crearAdmin().catch(err => {
  console.error('\n❌  Error:', err.message);
  process.exit(1);
});
