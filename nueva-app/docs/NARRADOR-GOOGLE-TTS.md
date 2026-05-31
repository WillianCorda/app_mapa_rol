# Narrador con voz argentina (Google Cloud TTS)

Para usar la **voz argentina** en el narrador, la app puede usar Google Cloud Text-to-Speech. Necesitas una API key (gratuita con cuota mensual).

## Pasos

1. **Entra en Google Cloud Console**  
   https://console.cloud.google.com/

2. **Crea un proyecto** (o elige uno existente).

3. **Activa la API de Text-to-Speech**  
   Menú → APIs y servicios → Biblioteca → busca **“Cloud Text-to-Speech API”** → Activar.

4. **Crea una API key**  
   APIs y servicios → Credenciales → Crear credenciales → **Clave de API**.  
   Copia la clave.

5. **En Hexara**  
   - Abre **Ajustes** (icono de engranaje).  
   - En **“Narrador en la nube (Google, voz Argentina)”** pega la API key y pulsa **Guardar clave**.

6. **Usar el narrador**  
   - Ve a la pestaña **Voz**.  
   - En **Narrador** elige **Google (Argentina)**.  
   - Escribe el texto y pulsa **Narrar**.

## Cuota gratuita

Google ofrece **1 millón de caracteres al mes** gratis para la API de Text-to-Speech. Para narraciones ocasionales suele ser suficiente.

## Privacidad

La API key se guarda **solo en tu PC** (en la carpeta de datos de Hexara). El texto que narres se envía a los servidores de Google para generar el audio.
