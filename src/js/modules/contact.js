import {
  CONTACT_API
} from '../config.js';

const PLACEHOLDER_PREFIX =
  '__CONFIRMAR_';

const MAX_PDF_FILES = 10;

const MAX_PDF_TOTAL_BYTES =
  40 * 1024 * 1024;

/*
 * --------------------------------------------------
 * Configuración
 * --------------------------------------------------
 */

function assertConfiguration() {
  if (!CONTACT_API.enabled) {
    throw new Error(
      'El formulario todavía está en modo seguro. Falta confirmar el contrato de la API.'
    );
  }

  if (
    !CONTACT_API.endpoint ||
    typeof CONTACT_API.endpoint !== 'string'
  ) {
    throw new Error(
      'Falta configurar el endpoint de contacto.'
    );
  }

  const isLocalhost =
    CONTACT_API.endpoint.startsWith(
      'http://localhost'
    ) ||
    CONTACT_API.endpoint.startsWith(
      'http://127.0.0.1'
    );

  const isHttps =
    CONTACT_API.endpoint.startsWith(
      'https://'
    );

  if (
    !isHttps &&
    !isLocalhost
  ) {
    throw new Error(
      'El endpoint debe utilizar HTTPS fuera del entorno local.'
    );
  }

  const hasPlaceholder =
    Object
      .values(
        CONTACT_API.fieldMap
      )
      .some(
        (value) =>
          String(value).startsWith(
            PLACEHOLDER_PREFIX
          )
      );

  if (hasPlaceholder) {
    throw new Error(
      'Falta confirmar los nombres de los campos de la API.'
    );
  }
}

/*
 * --------------------------------------------------
 * Lectura del formulario
 * --------------------------------------------------
 */

function readForm(form) {
  const formData =
    new FormData(form);

  return {
    name:
      String(
        formData.get('name') || ''
      ).trim(),

    email:
      String(
        formData.get('email') || ''
      ).trim(),

    subject:
      String(
        formData.get('subject') || ''
      ).trim(),

    message:
      String(
        formData.get('message') || ''
      ).trim(),

    website:
      String(
        formData.get('website') || ''
      ).trim()
  };
}

/*
 * --------------------------------------------------
 * Validación de datos
 * --------------------------------------------------
 */

function validate(data) {
  if (data.website) {
    return false;
  }

  if (
    data.name.length < 2 ||
    data.name.length > 80
  ) {
    return false;
  }

  const emailPattern =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (
    !emailPattern.test(
      data.email
    )
  ) {
    return false;
  }

  if (
    data.subject.length < 3 ||
    data.subject.length > 120
  ) {
    return false;
  }

  if (
    data.message.length < 10 ||
    data.message.length > 2000
  ) {
    return false;
  }

  return true;
}

/*
 * --------------------------------------------------
 * Validación de PDF
 * --------------------------------------------------
 */

function getPdfFiles(form) {
  const input =
    form.querySelector(
      'input[name="pdfs"]'
    );

  if (!input) {
    return [];
  }

  return Array.from(
    input.files || []
  );
}

function validatePdfFiles(files) {
  if (
    files.length >
    MAX_PDF_FILES
  ) {
    throw new Error(
      `Puedes adjuntar un máximo de ${MAX_PDF_FILES} archivos PDF.`
    );
  }

  let totalBytes = 0;

  for (const file of files) {
    const extensionIsPdf =
      file.name
        .toLowerCase()
        .endsWith('.pdf');

    const mimeIsPdf =
      file.type ===
        'application/pdf' ||
      file.type === '';

    if (
      !extensionIsPdf ||
      !mimeIsPdf
    ) {
      throw new Error(
        `El archivo "${file.name}" no es un PDF válido.`
      );
    }

    totalBytes +=
      file.size;
  }

  if (
    totalBytes >
    MAX_PDF_TOTAL_BYTES
  ) {
    throw new Error(
      'El tamaño total de los PDF no puede superar 40 MB.'
    );
  }

  return {
    files,
    totalBytes
  };
}

/*
 * --------------------------------------------------
 * Mapeo frontend → API
 * --------------------------------------------------
 */

function mapPayload(data) {
  return Object.fromEntries(
    Object
      .entries(
        CONTACT_API.fieldMap
      )
      .map(
        ([
          localKey,
          apiKey
        ]) => [
          apiKey,
          data[localKey]
        ]
      )
  );
}

/*
 * --------------------------------------------------
 * Construcción de FormData
 * --------------------------------------------------
 */

function createMultipartBody(
  data,
  files
) {
  const payload =
    mapPayload(data);

  const formData =
    new FormData();

  Object
    .entries(payload)
    .forEach(
      ([
        key,
        value
      ]) => {
        if (
          value !== undefined &&
          value !== null
        ) {
          formData.append(
            key,
            String(value)
          );
        }
      }
    );

  /*
   * Honeypot.
   *
   * La API espera "website".
   */
  formData.set(
    'website',
    data.website || ''
  );

  /*
   * Todos los archivos deben utilizar
   * exactamente el nombre "pdfs",
   * porque el backend usa:
   *
   * uploadPdf.array('pdfs', ...)
   */
  for (const file of files) {
    formData.append(
      'pdfs',
      file,
      file.name
    );
  }

  return formData;
}

/*
 * --------------------------------------------------
 * Elementos de progreso
 * --------------------------------------------------
 */

function getUploadProgressElements() {
  return {
    container:
      document.getElementById(
        'upload-progress-container'
      ),

    text:
      document.getElementById(
        'upload-progress-text'
      ),

    percent:
      document.getElementById(
        'upload-progress-percent'
      ),

    bar:
      document.getElementById(
        'upload-progress-bar'
      ),

    fill:
      document.getElementById(
        'upload-progress-fill'
      )
  };
}

/*
 * --------------------------------------------------
 * Reset progreso
 * --------------------------------------------------
 */

function resetUploadProgress() {
  const elements =
    getUploadProgressElements();

  if (
    !elements.container ||
    !elements.text ||
    !elements.percent ||
    !elements.bar ||
    !elements.fill
  ) {
    return;
  }

  elements.container.hidden =
    true;

  elements.container.classList.remove(
    'is-processing',
    'is-success',
    'is-error'
  );

  elements.text.textContent =
    'Subiendo...';

  elements.percent.textContent =
    '0%';

  elements.fill.style.width =
    '0%';

  elements.bar.setAttribute(
    'aria-valuenow',
    '0'
  );
}

/*
 * --------------------------------------------------
 * Mostrar progreso
 * --------------------------------------------------
 */

function showUploadProgress() {
  const elements =
    getUploadProgressElements();

  if (!elements.container) {
    return;
  }

  elements.container.hidden =
    false;

  elements.container.classList.remove(
    'is-processing',
    'is-success',
    'is-error'
  );
}

/*
 * --------------------------------------------------
 * Actualizar porcentaje
 * --------------------------------------------------
 */

function updateUploadProgress(
  percent
) {
  const elements =
    getUploadProgressElements();

  if (
    !elements.percent ||
    !elements.bar ||
    !elements.fill
  ) {
    return;
  }

  const safePercent =
    Math.max(
      0,
      Math.min(
        100,
        Math.round(percent)
      )
    );

  elements.percent.textContent =
    `${safePercent}%`;

  elements.fill.style.width =
    `${safePercent}%`;

  elements.bar.setAttribute(
    'aria-valuenow',
    String(safePercent)
  );
}

/*
 * --------------------------------------------------
 * Procesando
 * --------------------------------------------------
 */

function showUploadProcessing() {
  const elements =
    getUploadProgressElements();

  if (
    !elements.container ||
    !elements.text ||
    !elements.percent
  ) {
    return;
  }

  elements.container.classList.remove(
    'is-success',
    'is-error'
  );

  elements.container.classList.add(
    'is-processing'
  );

  elements.text.textContent =
    'Procesando archivos...';

  elements.percent.textContent =
    '100%';
}

/*
 * --------------------------------------------------
 * Éxito
 * --------------------------------------------------
 */

function showUploadSuccess() {
  const elements =
    getUploadProgressElements();

  if (
    !elements.container ||
    !elements.text ||
    !elements.percent ||
    !elements.bar ||
    !elements.fill
  ) {
    return;
  }

  elements.container.classList.remove(
    'is-processing',
    'is-error'
  );

  elements.container.classList.add(
    'is-success'
  );

  elements.text.textContent =
    'Formulario enviado correctamente';

  elements.percent.textContent =
    '100%';

  elements.fill.style.width =
    '100%';

  elements.bar.setAttribute(
    'aria-valuenow',
    '100'
  );
}

/*
 * --------------------------------------------------
 * Error
 * --------------------------------------------------
 */

function showUploadError() {
  const elements =
    getUploadProgressElements();

  if (
    !elements.container ||
    !elements.text
  ) {
    return;
  }

  elements.container.classList.remove(
    'is-processing',
    'is-success'
  );

  elements.container.classList.add(
    'is-error'
  );

  elements.text.textContent =
    'No fue posible completar el envío';
}

/*
 * --------------------------------------------------
 * Estado textual
 * --------------------------------------------------
 */

function setStatus(
  element,
  message,
  state = 'info'
) {
  if (!element) {
    return;
  }

  element.textContent =
    message;

  element.dataset.state =
    state;
}

/*
 * --------------------------------------------------
 * XMLHttpRequest con progreso
 * --------------------------------------------------
 */

function uploadFormWithProgress({
  url,
  formData,
  timeoutMs,
  onProgress
}) {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const xhr =
        new XMLHttpRequest();

      xhr.open(
        'POST',
        url,
        true
      );

      xhr.responseType =
        'json';

      xhr.timeout =
        timeoutMs;

      xhr.setRequestHeader(
        'Accept',
        'application/json'
      );

      /*
       * NO establecer Content-Type.
       *
       * El navegador debe generar
       * automáticamente:
       *
       * multipart/form-data;
       * boundary=...
       */

      xhr.upload.addEventListener(
        'progress',
        (event) => {
          if (
            !event.lengthComputable
          ) {
            return;
          }

          const percent =
            (
              event.loaded /
              event.total
            ) * 100;

          onProgress?.(
            percent
          );
        }
      );

      xhr.upload.addEventListener(
        'load',
        () => {
          /*
           * El navegador terminó de
           * transmitir el request.
           *
           * La API todavía puede estar:
           *
           * - validando PDF
           * - subiendo a GCS
           * - guardando PostgreSQL
           * - enviando correos
           */
          onProgress?.(
            100
          );
        }
      );

      xhr.addEventListener(
        'load',
        () => {
          let response =
            xhr.response;

          /*
           * Algunos navegadores/proxies
           * pueden no entregar JSON
           * directamente.
           */
          if (
            !response &&
            xhr.responseText
          ) {
            try {
              response =
                JSON.parse(
                  xhr.responseText
                );
            } catch {
              response =
                null;
            }
          }

          if (
            xhr.status >= 200 &&
            xhr.status < 300
          ) {
            resolve(
              response || {
                ok: true
              }
            );

            return;
          }

          reject(
            new Error(
              response?.message ||
              `La API respondió con estado ${xhr.status}.`
            )
          );
        }
      );

      xhr.addEventListener(
        'error',
        () => {
          reject(
            new Error(
              'No fue posible conectar con el servidor.'
            )
          );
        }
      );

      xhr.addEventListener(
        'timeout',
        () => {
          const error =
            new Error(
              'La solicitud tardó demasiado.'
            );

          error.name =
            'TimeoutError';

          reject(error);
        }
      );

      xhr.addEventListener(
        'abort',
        () => {
          const error =
            new Error(
              'La subida fue cancelada.'
            );

          error.name =
            'AbortError';

          reject(error);
        }
      );

      xhr.send(
        formData
      );
    }
  );
}

/*
 * --------------------------------------------------
 * Inicialización
 * --------------------------------------------------
 */

export function initContactForm() {
  const form =
    document.querySelector(
      '[data-contact-form]'
    );

  if (!form) {
    return;
  }

  const status =
    form.querySelector(
      '[data-form-status]'
    );

  const submitButton =
    form.querySelector(
      'button[type="submit"]'
    );

  resetUploadProgress();

  form.addEventListener(
    'submit',
    async (event) => {
      event.preventDefault();

      /*
       * Validación HTML nativa.
       */
      if (
        !form.checkValidity()
      ) {
        form.classList.add(
          'was-validated'
        );

        setStatus(
          status,
          'Revisa los campos del formulario.',
          'error'
        );

        return;
      }

      const data =
        readForm(form);

      if (!validate(data)) {
        form.classList.add(
          'was-validated'
        );

        setStatus(
          status,
          'Revisa los campos del formulario.',
          'error'
        );

        return;
      }

      let files;

      try {
        files =
          getPdfFiles(form);

        validatePdfFiles(
          files
        );

        assertConfiguration();
      } catch (error) {
        setStatus(
          status,
          error.message,
          'error'
        );

        return;
      }

      const formData =
        createMultipartBody(
          data,
          files
        );

      if (submitButton) {
        submitButton.disabled =
          true;
      }

      resetUploadProgress();
      showUploadProgress();

      setStatus(
        status,
        files.length > 0
          ? 'Subiendo formulario y archivos…'
          : 'Enviando mensaje…',
        'info'
      );

      let uploadFinished =
        false;

      try {
        const response =
          await uploadFormWithProgress({
            url:
              CONTACT_API.endpoint,

            formData,

            timeoutMs:
              CONTACT_API.timeoutMs,

            onProgress(
              percent
            ) {
              updateUploadProgress(
                percent
              );

              if (
                percent >= 100 &&
                !uploadFinished
              ) {
                uploadFinished =
                  true;

                showUploadProcessing();

                setStatus(
                  status,
                  'Carga completada. Procesando solicitud…',
                  'info'
                );
              }
            }
          });

        if (
          response?.ok === false
        ) {
          throw new Error(
            response.message ||
            'No fue posible enviar el formulario.'
          );
        }

        showUploadSuccess();

        setStatus(
          status,
          'Mensaje enviado correctamente.',
          'success'
        );

        form.reset();

        form.classList.remove(
          'was-validated'
        );
      } catch (error) {
        showUploadError();

        setStatus(
          status,
          error.message ||
          'No fue posible enviar el formulario.',
          'error'
        );

        console.error(
          'Error enviando formulario:',
          error
        );
      } finally {
        if (submitButton) {
          submitButton.disabled =
            false;
        }
      }
    }
  );
}