# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## Registro de asistencias

Al escanear el QR del gimnasio, la app crea un registro diario en `asistencias/{clientId_YYYY-MM-DD}` con `nombreUsuario`, `usuario`, `hora` (marca de tiempo de Firestore), `fecha`, `cliente` (ID del documento en `clientes`), `nombreCliente` y `estado` (`presente`). En la misma transacción actualiza `clientes/{clientId}`: `asistencias` contiene fechas únicas en formato `YYYY-MM-DD`, junto con `rachaAsistencia`, `mejorRachaAsistencia` y `totalAsistencias`. Un segundo escaneo el mismo día no duplica el registro.

La PWA debe usar estos mismos campos para consultar o mostrar el historial del cliente y el calendario de perfil.: Chat with Expo users and ask questions.

## Chatbot y rutinas personalizadas

Las conversaciones de Sporti se guardan en `conversaciones_chatbot/{conversationId}` y sus mensajes en la subcolección `mensajes`. Cada documento de conversación incluye el ID del cliente, el objetivo, las respuestas del cuestionario y el paso actual para poder reabrir y continuar el chat. El historial se consulta para el cliente que inició sesión.

Al completar el cuestionario, Sporti crea un plan semanal usando ejercicios del catálogo local y guarda cada ejercicio en `rutinas` con el mismo formato que los ejercicios añadidos manualmente (`clienteId`, `ejercicioId`, `ejercicioNombre`, `dia`, `equipo`, `grupoMuscular`, `seriesAsignadas` y `repeticionesAsignadas`). La rutina también queda escrita como respuesta en el historial del chat. Desde Mi rutina se puede abrir el día correspondiente y ajustar series y repeticiones antes de entrenar; los cambios se guardan en Firestore.

Según el objetivo del cuestionario, Sporti busca recetas de `recetas` cuyas etiquetas `objetivos` coincidan y las guarda en `favoritos_recetas/{clientId_recetaId}`. La respuesta del chatbot muestra las recetas guardadas y permite abrir directamente Mis favoritos en Nutrición. El acceso directo `/(tabs)/routine?view=routine` abre Mi rutina; `/(tabs)/nutrition?view=favorites` abre los favoritos nutricionales.

Configura las reglas de Firestore para que cada cliente solo pueda acceder a sus documentos de conversación, rutinas y favoritos de recetas. La aplicación filtra las consultas por `clienteId`, pero esa condición de cliente no sustituye las reglas de seguridad del servidor.
