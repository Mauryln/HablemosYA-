import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCSQ7gZ02qD9I84zbOMqwkXg7HVsgpo86U",
  authDomain: "laboratoriobasedatos.firebaseapp.com",
  databaseURL: "https://laboratoriobasedatos-default-rtdb.firebaseio.com/",
  projectId: "laboratoriobasedatos",
  storageBucket: "laboratoriobasedatos.appspot.com",
  messagingSenderId: "409126326625",
  appId: "1:409126326625:web:002a76157d642cf07a3520",
  measurementId: "G-YKNQST887V"
};

// Inicializa Firebase solo una vez
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { app, database };
