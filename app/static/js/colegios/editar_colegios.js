/**
 * 1. Lógica de Vista Previa (Compartida)
 * Se encarga de mostrar la imagen cuando el usuario selecciona un archivo nuevo
 */
function mostrarVistaPrevia(input, previewId, textId) {
    const file = input.files[0];
    const preview = document.getElementById(previewId);
    const text = document.getElementById(textId);

    if (file && preview) {
        const reader = new FileReader();
        reader.onload = e => {
            preview.src = e.target.result;
            preview.classList.remove("d-none");
            if (text) text.classList.add("d-none");
        };
        reader.readAsDataURL(file);
    }
}

/**
 * 2. Gestión de imágenes existentes (Compartida)
 * Muestra las imágenes que ya están guardadas en el servidor al abrir el modo edición
 */
function gestionarImagenPreview(filename, previewId, textId) {
    const preview = document.getElementById(previewId);
    const text = document.getElementById(textId);
    if (filename && filename !== 'None' && filename !== '') {
        preview.src = `/static/uploads/${filename}`;
        preview.classList.remove("d-none");
        if (text) text.classList.add("d-none");
    } else {
        if (preview) preview.classList.add("d-none");
        if (text) text.classList.remove("d-none");
    }
}

document.addEventListener("DOMContentLoaded", function() {
    const formColegio = document.getElementById("formCrearColegio");
    const modalTitle = document.getElementById('modalTitle');
    const logoInput = document.getElementById("logo_path");
    const firmaInput = document.getElementById("firma_path");
    
    const btnGuardarNuevo = document.getElementById('btn-guardar-nuevo');
    const btnActualizarEdit = document.getElementById('btn-actualizar-edit');

    if (logoInput) logoInput.addEventListener("change", function() { mostrarVistaPrevia(this, "previewLogo", "logoText"); });
    if (firmaInput) firmaInput.addEventListener("change", function() { mostrarVistaPrevia(this, "previewFirma", "firmaText"); });

    // --- B. LÓGICA DE EDICIÓN ---
    /**
 * B. LÓGICA DE EDICIÓN (Global para ser llamada desde tarjetas dinámicas)
 */
window.prepararEdicion = function(colegio) {
    const formColegio = document.getElementById("formCrearColegio");
    const modalTitle = document.getElementById('modalTitle');
    const btnGuardarNuevo = document.getElementById('btn-guardar-nuevo');
    const btnActualizarEdit = document.getElementById('btn-actualizar-edit');

    // 1. Configurar UI del Modal
    if (modalTitle) modalTitle.textContent = "Editar Información del Colegio";
    if (btnGuardarNuevo) btnGuardarNuevo.classList.add('d-none'); 
    if (btnActualizarEdit) btnActualizarEdit.classList.remove('d-none');
    
    // 2. Configurar Ruta de envío
    formColegio.action = `/colegios/editar/${colegio.id}`;

    // 3. Llenar campos de texto y selectores
    const campos = [
        'nombre', 'nit', 'direccion', 'telefono', 
        'municipio', 'rector_nombre', 'rector_documento', 
        'rector_tipo_documento'
    ];

    campos.forEach(c => {
        const input = formColegio.querySelector(`[name="${c}"]`);
        if (input) {
            // Usamos el objeto 'colegio' que viene del JSON directamente
            input.value = colegio[c] || '';
        }
    });

    // 4. Gestionar imágenes (Logo y Firma)
    gestionarImagenPreview(colegio.logo_path, "previewLogo", "logoText");
    gestionarImagenPreview(colegio.firma_path, "previewFirma", "firmaText");
    
    // 5. Mostrar el Modal
    const modalElem = document.getElementById('crearColegioModal');
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElem);
    modalInstance.show();
};

    // --- C. ENVÍO INTELIGENTE (ACTUALIZADO CON SEGURIDAD) ---
if (formColegio) {
    formColegio.addEventListener("submit", function(e) {
        
        // FILTRO CRUCIAL:
        // Si el botón de actualizar está oculto (d-none), significa que estamos CREANDO.
        if (btnActualizarEdit && btnActualizarEdit.classList.contains('d-none')) {
            return; // Salimos y permitimos el submit normal (Flask-WTF leerá el input hidden solo)
        }

        // Si llegamos aquí, es porque SÍ estamos EDITANDO
        e.preventDefault();

        Swal.fire({ 
            title: 'Actualizando...', 
            text: 'Guardando los cambios del colegio',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); } 
        });

        // 1. Capturamos el token del input que ya agregaste al HTML
        const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
        
        // 2. Preparamos el FormData (incluye archivos: logo y firma)
        const formData = new FormData(this);

        // 3. Enviamos con el "Ticket" en los Headers
        fetch(this.action, {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrfToken // <--- REFUERZO DE SEGURIDAD PARA AJAX
            },
            body: formData
        })
        .then(response => {
            if (!response.ok || response.headers.get("content-type").includes("text/html")) {
                throw new Error("Respuesta no válida del servidor");
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'success') {
                Swal.fire({
                    icon: 'success',
                    title: '¡Actualizado!',
                    text: data.message
                }).then(() => { location.reload(); });
            } else {
                Swal.fire({ icon: 'error', title: 'Error', text: data.message });
            }
        })
        .catch(error => {
            console.error('Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error de proceso',
                text: 'Hubo un problema al validar el ticket de seguridad o procesar los archivos.'
            });
        });
    });
  }
});