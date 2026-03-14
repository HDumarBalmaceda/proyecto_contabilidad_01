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
    document.addEventListener('click', function(e) {
        const btnEditar = e.target.closest('.btn-editar');
        if (btnEditar) {
            if (modalTitle) modalTitle.textContent = "Editar Información del Colegio";
            if (btnGuardarNuevo) btnGuardarNuevo.classList.add('d-none'); 
            if (btnActualizarEdit) btnActualizarEdit.classList.remove('d-none');
            
            const id = btnEditar.getAttribute('data-id');
            formColegio.action = `/colegios/editar/${id}`;

            const campos = ['nombre', 'nit', 'direccion', 'telefono', 'municipio', 'rector_nombre', 'rector_documento', 'rector_tipo_documento'];
            campos.forEach(c => {
                const input = formColegio.querySelector(`[name="${c}"]`);
                if (input) input.value = btnEditar.getAttribute(`data-${c}`) || '';
            });

            gestionarImagenPreview(btnEditar.getAttribute('data-logo'), "previewLogo", "logoText");
            gestionarImagenPreview(btnEditar.getAttribute('data-firma'), "previewFirma", "firmaText");
            
            bootstrap.Modal.getOrCreateInstance(document.getElementById('crearColegioModal')).show();
        }
    });

    // --- C. ENVÍO INTELIGENTE ---
    if (formColegio) {
        formColegio.addEventListener("submit", function(e) {
            
            // FILTRO CRUCIAL:
            // Si el botón de actualizar está oculto (d-none), significa que estamos CREANDO.
            // En ese caso, NO ejecutamos e.preventDefault() y dejamos que el navegador
            // haga el envío tradicional hacia /colegios/crear.
            if (btnActualizarEdit && btnActualizarEdit.classList.contains('d-none')) {
                return; // Salimos de la función y permitimos el submit normal
            }

            // Si llegamos aquí, es porque SÍ estamos EDITANDO (el botón de actualizar es visible)
            e.preventDefault();

            Swal.fire({ 
                title: 'Actualizando...', 
                text: 'Guardando los cambios del colegio',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); } 
            });

            const formData = new FormData(this);

            fetch(this.action, {
                method: 'POST',
                body: formData
            })
            .then(response => {
                // Si recibimos un HTML (error 404, 500 o redirección), lanzamos error para el catch
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
                    text: 'Asegúrate de estar editando y no creando. Si el problema persiste, contacta al admin.'
                });
            });
        });
    }
});