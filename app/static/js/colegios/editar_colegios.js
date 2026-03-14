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
    
    // Botones del footer del modal
    const btnGuardarNuevo = document.getElementById('btn-guardar-nuevo');
    const btnActualizarEdit = document.getElementById('btn-actualizar-edit');

    // --- A. EVENTOS DE CARGA DE ARCHIVOS ---
    if (logoInput) logoInput.addEventListener("change", function() { mostrarVistaPrevia(this, "previewLogo", "logoText"); });
    if (firmaInput) firmaInput.addEventListener("change", function() { mostrarVistaPrevia(this, "previewFirma", "firmaText"); });

    // --- B. LÓGICA DE EDICIÓN (Delegación de eventos) ---
    document.addEventListener('click', function(e) {
        const btnEditar = e.target.closest('.btn-editar');

        if (btnEditar) {
            // 1. Configuración Visual del Modal
            if (modalTitle) modalTitle.textContent = "Editar Información del Colegio";
            if (btnGuardarNuevo) btnGuardarNuevo.classList.add('d-none'); 
            if (btnActualizarEdit) btnActualizarEdit.classList.remove('d-none');
            
            // 2. Definir Ruta de Acción Dinámica
            const id = btnEditar.getAttribute('data-id');
            formColegio.action = `/colegios/editar/${id}`;

            // 3. Llenado Automático de Campos desde Data-Attributes
            const campos = ['nombre', 'nit', 'direccion', 'telefono', 'municipio', 'rector_nombre', 'rector_documento', 'rector_tipo_documento'];
            campos.forEach(c => {
                const input = formColegio.querySelector(`[name="${c}"]`);
                if (input) input.value = btnEditar.getAttribute(`data-${c}`) || '';
            });

            // 4. Cargar Imágenes actuales en los contenedores de vista previa
            gestionarImagenPreview(btnEditar.getAttribute('data-logo'), "previewLogo", "logoText");
            gestionarImagenPreview(btnEditar.getAttribute('data-firma'), "previewFirma", "firmaText");
            
            // 5. Mostrar el Modal (Bootstrap 5)
            const modalInstance = bootstrap.Modal.getOrCreateInstance(document.getElementById('crearColegioModal'));
            modalInstance.show();
        }
    });

   // --- C. ENVÍO MEDIANTE FETCH PARA CAPTURAR EL JSON ---
if (formColegio) {
    formColegio.addEventListener("submit", function(e) {
        // 1. Evitar que el formulario recargue la página
        e.preventDefault();

        // 2. Mostrar alerta de carga
        Swal.fire({ 
            title: 'Procesando...', 
            text: 'Estamos actualizando la información',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); } 
        });

        // 3. Preparar los datos (incluyendo archivos)
        const formData = new FormData(this);

        // 4. Enviar mediante Fetch al "action" que definimos dinámicamente
        fetch(this.action, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json()) // Convertir la respuesta de Flask a JSON
        .then(data => {
            if (data.status === 'success') {
                // Alerta de éxito
                Swal.fire({
                    icon: 'success',
                    title: '¡Actualizado!',
                    text: data.message,
                    confirmButtonText: 'Genial'
                }).then(() => {
                    // Recargar la página para ver los cambios
                    location.reload();
                });
            } else {
                // Alerta de error (por validación o permisos)
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.message
                });
            }
        })
        .catch(error => {
            console.error('Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error de conexión',
                text: 'No se pudo comunicar con el servidor.'
            });
        });
    });
}
});