const { createHash, randomBytes, scrypt, timingSafeEqual } = require("node:crypto");
const { promisify } = require("node:util");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");
const { HttpsError, onCall } = require("firebase-functions/v2/https");

initializeApp();

const db = getFirestore();
const auth = getAuth();
const scryptAsync = promisify(scrypt);

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

async function validateAndUpgradePassword(clienteRef, password) {
  const newSalt = randomBytes(16).toString("hex");
  const newHash = (await scryptAsync(password, newSalt, 64)).toString("hex");

  return db.runTransaction(async (transaction) => {
    const clienteSnapshot = await transaction.get(clienteRef);

    if (!clienteSnapshot.exists) {
      return false;
    }

    const cliente = clienteSnapshot.data();

    if (
      typeof cliente.passwordHash === "string" &&
      typeof cliente.passwordSalt === "string"
    ) {
      const candidateHash = (
        await scryptAsync(password, cliente.passwordSalt, 64)
      ).toString("hex");

      return safeEqual(candidateHash, cliente.passwordHash);
    }

    if (
      typeof cliente.contrasena !== "string" ||
      !safeEqual(password, cliente.contrasena)
    ) {
      return false;
    }

    transaction.update(clienteRef, {
      passwordHash: newHash,
      passwordSalt: newSalt,
      contrasena: FieldValue.delete(),
    });

    return true;
  });
}

exports.loginCliente = onCall({ region: "us-central1" }, async (request) => {
  const email = request.data?.email?.trim().toLowerCase();
  const password = request.data?.password;

  if (
    typeof email !== "string" ||
    !email ||
    typeof password !== "string" ||
    !password
  ) {
    throw new HttpsError("invalid-argument", "Correo y contraseña son obligatorios");
  }

  const clientesSnapshot = await db
    .collection("clientes")
    .where("correo", "==", email)
    .limit(2)
    .get();

  if (clientesSnapshot.size !== 1) {
    throw new HttpsError("unauthenticated", "Credenciales inválidas");
  }

  const clienteRef = clientesSnapshot.docs[0].ref;
  const passwordIsValid = await validateAndUpgradePassword(clienteRef, password);

  if (!passwordIsValid) {
    throw new HttpsError("unauthenticated", "Credenciales inválidas");
  }

  const uid = `cliente_${createHash("sha256")
    .update(clienteRef.path)
    .digest("hex")}`;
  const token = await auth.createCustomToken(uid, {
    clienteId: clienteRef.id,
    tipo: "cliente",
  });

  return { token };
});