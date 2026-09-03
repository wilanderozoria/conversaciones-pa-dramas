# Conversaciones de Audio (Gemini TTS & MP3)

Aplicación web full-stack para generar conversaciones y diálogos hablados realistas entre dos interlocutores utilizando inteligencia artificial (Google Gemini) y voces neuronales (Gemini TTS), con exportación directa y descarga en formato **MP3** y **WAV**.

---

## 🚀 Requisitos Previos

- **Node.js** 18+ o superior (o Bun)
- **API Key de Google Gemini** ([Google AI Studio](https://aistudio.google.com/))

---

## 🛠️ Instalación y Puesta en Marcha

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Configurar variables de entorno**:
   Crea un archivo `.env` en la raíz del proyecto con tu clave de Gemini:
   ```env
   GEMINI_API_KEY="tu_clave_api_de_gemini"
   ```

3. **Ejecutar en modo de desarrollo**:
   ```bash
   npm run dev
   ```
   Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

4. **Compilar para producción**:
   ```bash
   npm run build
   npm start
   ```

---

## 🎙️ Características Principales

- **Configuración de 2 Locutores**: Elige nombre, rol y asigna voces neuronales independientes (Kore, Puck, Zephyr, Fenrir, Charon).
- **Generación Inteligente de Guiones**: Crea diálogos automáticos adaptados al tema, tono y cantidad de turnos seleccionados.
- **Edición en Vivo**: Edita el texto de cualquier línea, cambia quién habla o añade nuevos turnos.
- **Ensamblado Maestro & Descarga en MP3**: Genera el audio concatenado con pausas naturales y expórtalo a MP3 (128 kbps) o WAV de alta fidelidad.
- **Biblioteca Local**: Guarda tus conversaciones en el navegador para escucharlas o descargarlas cuando quieras.
