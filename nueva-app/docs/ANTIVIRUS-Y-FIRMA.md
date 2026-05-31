# Antivirus y firma de código (Windows)

Las apps Electron sin firmar suelen ser marcadas como sospechosas por Windows Defender u otros antivirus. Puedes reducir falsos positivos con lo siguiente.

---

## Si el build falla con "EBUSY: resource busy or locked"

Ese error suele aparecer cuando algo tiene abierto el `.exe` (la app, el antivirus, etc.) mientras se construye el instalador.

1. **Cierra la app** Hexara si está abierta.
2. **Vuelve a ejecutar** `npm run dist:win`; el script ya borra `dist-electron` antes de construir.
3. Si sigue fallando, **añade una exclusión en Windows Defender** para la carpeta del proyecto:
   - Configuración de Windows → Privacidad y seguridad → Seguridad de Windows → Protección contra virus y amenazas → Configuración de protección contra virus y amenazas → Exclusiones → Añadir exclusión → Carpeta → selecciona `C:\Users\...\nueva-app`.
   - Así el antivirus no bloqueará el `.exe` recién creado durante el build.

---

## 1. Enviar el instalador a Microsoft (gratis)

Si tu instalador es legítimo y un antivirus lo marca, puedes pedir que lo analicen y lo marquen como seguro:

1. Abre: **https://www.microsoft.com/en-us/wdsi/filesubmission**
2. Elige **Submit a file for analysis**.
3. Sube el `.exe` del instalador (o el ejecutable que marque el antivirus).
4. Indica que es un **falso positivo** y que eres el desarrollador.
5. Tras el análisis, Microsoft puede añadir una excepción y dejar de bloquearlo.

Conviene hacerlo cada vez que publiques una versión nueva si sigue dando problemas.

---

## 2. Firmar el ejecutable (recomendado a medio plazo)

Firmar el instalador y el `.exe` de la app con un **certificado de firma de código** hace que Windows y la mayoría de antivirus confíen más y reduzcan alertas.

- **Certificado estándar (OV):** ~100–400 €/año. SmartScreen puede seguir mostrando advertencia hasta que haya “reputación”.
- **Certificado EV (Extended Validation):** más caro, pero suele dar confianza inmediata en SmartScreen.

Proveedores habituales: DigiCert, Sectigo, SSL.com, etc. Tras tener el certificado (archivo `.pfx` o instalado en Windows):

1. Configura las variables de entorno (o un `.env` que no subas a Git):

   ```bash
   CSC_LINK=path\to\tu-certificado.pfx
   CSC_KEY_PASSWORD=tu_contraseña_del_pfx
   ```

2. En `package.json`, en la sección `build.win`, pon `"signAndEditExecutable": true` (o quita `false` si ya está definido).

3. Genera el instalador:

   ```bash
   npm run dist
   ```

Si usas **Azure Trusted Signing** (servicio de Microsoft), en la doc de electron-builder se explica cómo usar `win.azureSignOptions` en lugar de un `.pfx` local.

---

## 3. Reputación y distribución

- Publica siempre desde el **mismo sitio** (p. ej. GitHub Releases o tu web con HTTPS).
- Evita acortadores de URL o enlaces en sitios poco fiables.
- Con el tiempo, más descargas e instalaciones desde una fuente estable pueden mejorar la reputación del archivo (sobre todo si está firmado).

---

## Resumen

| Opción                    | Coste   | Efecto                                   |
|---------------------------|---------|------------------------------------------|
| Enviar a Microsoft        | Gratis  | Pueden dejar de marcar esa versión       |
| Certificado de firma (OV) | ~€/año  | Menos alertas, más confianza             |
| Certificado EV            | Mayor   | Confianza rápida en SmartScreen           |

Para empezar: envía el instalador como falso positivo en el enlace de arriba. Si vas a publicar de forma seria, plantéate comprar un certificado y firmar el instalador.
